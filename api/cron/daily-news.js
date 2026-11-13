const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const { syncPopularNews } = require('../../lib/popular-news');
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
function karachiDate(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return [g('year'),g('month'),g('day')].join('-')}
function supa(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY;if(!url||!key)throw Error('Supabase publishable key is not configured.');return{url:url.replace(/\/$/,''),key}}
async function db(path,init={}){const {url,key}=supa(),h=new Headers(init.headers||{});h.set('apikey',key);h.set('Authorization',`Bearer ${key}`);if(init.body&&!h.has('content-type'))h.set('content-type','application/json');return fetch(`${url}/rest/v1/${path}`,{...init,headers:h})}
async function body(r){return r.json().catch(()=>({}))}
function https(v){try{const u=new URL(String(v||'').trim());return u.protocol==='https:'?u.toString():null}catch{return null}}
function og(html){for(const re of [/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i]){const m=html.match(re),u=https(m?.[1]);if(u)return u}return null}
function clean(s){return{category:String(s?.category||'').trim().slice(0,40),title_en:String(s?.title_en||'').trim().slice(0,160),title_ur:String(s?.title_ur||'').trim().slice(0,160),excerpt_en:String(s?.excerpt_en||'').trim().slice(0,500),excerpt_ur:String(s?.excerpt_ur||'').trim().slice(0,500),source_name:String(s?.source_name||'').trim().slice(0,80),source_url:https(s?.source_url),image_url:https(s?.image_url)}}
async function generate(today){
const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;if(!key)throw Error('GEMINI_API_KEY is not configured.');
const prompt='Pakistan Standard Time date: '+today+'. Search the live web now. Select exactly five distinct, important current stories for Pakistan readers. Use reputable current sources. No duplicate story. Return JSON array of exactly 5 objects with category,title_en,title_ur,excerpt_en,excerpt_ur,source_name,source_url,image_url. English and Urdu must describe the same story. source_url must be the actual article URL. image_url must be a genuinely relevant HTTPS image for that story, preferably from the source article or matching image search result. Do not use generic stock or unrelated political images for specific people/events. Do not invent facts.';
const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),25000);
try{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(MODEL)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],tools:[{google_search:{searchTypes:{webSearch:{},imageSearch:{}}}}],generationConfig:{responseMimeType:'application/json',responseSchema:{type:'array',minItems:5,maxItems:5,items:{type:'object',properties:{category:{type:'string'},title_en:{type:'string'},title_ur:{type:'string'},excerpt_en:{type:'string'},excerpt_ur:{type:'string'},source_name:{type:'string'},source_url:{type:'string'},image_url:{type:'string'}},required:['category','title_en','title_ur','excerpt_en','excerpt_ur','source_name','source_url','image_url']}}}}),signal:ac.signal});
const d=await body(r);if(!r.ok)throw Error(d?.error?.message||'Gemini news generation failed.');let stories;try{stories=JSON.parse(d?.candidates?.[0]?.content?.parts?.map(p=>p?.text||'').join('')||'')}catch{throw Error('Gemini returned invalid news JSON.')}
if(!Array.isArray(stories)||stories.length!==5)throw Error('Gemini did not return exactly five stories.');
const chunks=Array.isArray(d?.candidates?.[0]?.groundingMetadata?.groundingChunks)?d.candidates[0].groundingMetadata.groundingChunks.filter(x=>x?.image?.imageUri):[],seenSources=new Set(),seenImages=new Set(),out=[];
for(const raw of stories){const s=clean(raw);if(!s.category||!s.title_en||!s.title_ur||!s.excerpt_en||!s.excerpt_ur||!s.source_name||!s.source_url)throw Error('Generated story is incomplete.');if(seenSources.has(s.source_url))throw Error('Generated stories contain duplicate sources.');seenSources.add(s.source_url);let image=s.image_url;try{const a=await fetch(s.source_url,{headers:{'User-Agent':'PunjabiNews/1.0'},signal:AbortSignal.timeout(7000)});if(a.ok)image=og(await a.text())||image}catch{}
if(!https(image)){const host=new URL(s.source_url).hostname.replace(/^www\./,'');const c=chunks.find(x=>https(x.image.imageUri)&&(String(x.image.sourceUri||'').includes(host)||String(x.image.title||'').toLowerCase().includes(s.title_en.split(/\s+/).slice(0,3).join(' ').toLowerCase())));image=https(c?.image?.imageUri)}if(!https(image))throw Error('No relevant image found for a generated story.');if(seenImages.has(image))throw Error('Generated stories reused the same image.');seenImages.add(image);out.push({...s,image_url:image}); } return out; } finally { clearTimeout(tm); } }
async function current(today){const r=await db('news_posts?published_on=eq.'+encodeURIComponent(today)+'&is_published=eq.true&select=id,daily_rank,title_en,title_ur,excerpt_en,excerpt_ur,image_url,source_name,source_url,published_on&order=daily_rank.asc&limit=5');if(!r.ok)throw Error('Could not read current news.');const x=await body(r);return Array.isArray(x)?x:[]}
async function write(today,stories){
 const secret=process.env.CRON_SECRET;
 if(!secret)throw Error('CRON_SECRET is not configured.');
 const rows=stories.map((story,index)=>({...clean(story),daily_rank:index+1}));
 const response=await db('rpc/publish_daily_news',{
  method:'POST',
  headers:{Prefer:'return=representation'},
  body:JSON.stringify({p_secret:secret,p_rows:rows})
 });
 const saved=await body(response);
 if(!response.ok||Number(saved)!==5)throw Error('Secure daily-news publish failed: '+(saved?.message||saved?.details||response.status));
 const published=await current(today);
 if(published.length!==5||published.some((x,i)=>Number(x.daily_rank)!==i+1||x.published_on!==today||!x.title_en||!x.title_ur||!x.excerpt_en||!x.excerpt_ur||!x.image_url||!x.source_url))throw Error('Daily-news read-back verification failed.');
 return published;
}
module.exports = async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});
 const authorization=req.headers.authorization||'';
 if(!process.env.CRON_SECRET||authorization!=='Bearer '+process.env.CRON_SECRET)return res.status(401).json({error:'Unauthorized.'});
 const today=karachiDate();
 let dailyNews={ok:false,status:'failed'},popularNews={ok:false,status:'failed'};
 try{
  const edition=await current(today);
  if(edition.length===5&&edition.every((x,i)=>Number(x.daily_rank)===i+1&&x.title_en&&x.title_ur&&x.excerpt_en&&x.excerpt_ur&&x.image_url&&x.source_url)){
   dailyNews={ok:true,status:'already-current',date:today,count:5};
  }else{
   const stories=await generate(today);
   const published=await write(today,stories);
   dailyNews={ok:true,status:'updated',date:today,count:published.length};
  }
  console.log(JSON.stringify({event:'daily-news-update',status:dailyNews.status,date:today,count:dailyNews.count}));
 }catch(error){
  dailyNews={ok:false,status:'failed',error:error?.message||String(error)};
  console.error(JSON.stringify({event:'daily-news-update',status:'failed',date:today,message:dailyNews.error}));
 }
 try{
  const result=await syncPopularNews(today);
  popularNews={ok:true,...result};
  console.log(JSON.stringify({event:'popular-news-update',status:result.status,date:today,count:result.count}));
 }catch(error){
  popularNews={ok:false,status:'failed',error:error?.message||String(error)};
  console.error(JSON.stringify({event:'popular-news-update',status:'failed',date:today,message:popularNews.error}));
 }
 const ok=dailyNews.ok&&popularNews.ok;
 return res.status(ok?200:500).json({ok,date:today,dailyNews,popularNews});
};