const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
function karachiDate(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return [g('year'),g('month'),g('day')].join('-')}
function supa(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Server-side Supabase secret key is not configured.');return{url:url.replace(/\/$/,''),key}}
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
async function write(today,stories){const e=await db('news_posts?published_on=eq.'+encodeURIComponent(today)+'&select=id,daily_rank'),rows=await body(e);if(!e.ok||!Array.isArray(rows))throw Error('Could not inspect current news rows.');const hide=await db('news_posts?published_on=eq.'+encodeURIComponent(today)+'&is_published=eq.true',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({is_published:false})});if(!hide.ok)throw Error('Could not stage today news.');const byRank=new Map(rows.map(x=>[Number(x.daily_rank),x.id]));for(let i=0;i<5;i++){const s=stories[i],rank=i+1,p={...s,daily_rank:rank,published_on:today,is_published:false},id=byRank.get(rank),r=id?await db('news_posts?id=eq.'+encodeURIComponent(id)+'&published_on=eq.'+encodeURIComponent(today),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(p)}):await db('news_posts',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(p)});if(!r.ok)throw Error('Failed to stage rank '+rank+'.')}const staged=await db('news_posts?published_on=eq.'+encodeURIComponent(today)+'&select=id,daily_rank,title_en,title_ur,excerpt_en,excerpt_ur,image_url,source_name,source_url,published_on,is_published&order=daily_rank.asc'),sr=await body(staged);if(!staged.ok||!Array.isArray(sr)||sr.length!==5||sr.some((x,i)=>Number(x.daily_rank)!==i+1||x.is_published!==false||!x.image_url||!x.source_url))throw Error('Read-back verification failed before publication.');const pub=await db('news_posts?published_on=eq.'+encodeURIComponent(today),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({is_published:true})});if(!pub.ok)throw Error('Final publication write failed.');const v=await current(today);if(v.length!==5||v.some((x,i)=>Number(x.daily_rank)!==i+1||x.published_on!==today||!x.title_en||!x.title_ur||!x.excerpt_en||!x.excerpt_ur||!x.image_url||!x.source_url))throw Error('Final publication read-back verification failed.');return v}

function trendDecode(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
}
function trendTag(xml, name) {
  const re = new RegExp('<(?:[\\w-]+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?' + name + '\\s*>', 'i');
  const match = xml.match(re);
  return match ? trendDecode(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')) : '';
}
function trendSlug(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 100);
}
async function trendFeed(code, country) {
  const response = await fetch('https://trends.google.com/trending/rss?geo=' + code, {
    headers: { 'User-Agent': 'PunjabiNewsWorkspace/1.0', 'Accept': 'application/rss+xml, application/xml' },
    signal: AbortSignal.timeout(18000)
  });
  if (!response.ok) throw Error('Google Trends ' + code + ' returned HTTP ' + response.status);
  const xml = await response.text();
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  const rows = blocks.map(block => {
    const query = trendTag(block, 'title');
    const articleBlocks = block.match(/<(?:[\w-]+:)?news_item(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w-]+:)?news_item>/gi) || [];
    const articles = articleBlocks.map(item => ({
      title: trendTag(item, 'news_item_title'),
      url: https(trendTag(item, 'news_item_url')),
      image: https(trendTag(item, 'news_item_picture'))
    })).filter(item => item.title && item.url);
    return query ? { trend_key: code + ':' + trendSlug(query), country, google_query: query, approx_traffic: trendTag(block, 'approx_traffic'), articles } : null;
  }).filter(Boolean);
  if (!rows.length) throw Error('Google Trends ' + code + ' feed was empty.');
  return rows;
}
async function popularImage(url) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PunjabiNewsWorkspace/1.0)' }, signal: AbortSignal.timeout(7000) });
    if (response.ok) return og(await response.text());
  } catch {}
  return null;
}
async function syncPopularNews(today) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw Error('Gemini API key is not configured for popular news.');
  const feeds = await Promise.all([trendFeed('PK', 'Pakistan'), trendFeed('IN', 'India')]);
  const trends = [...feeds[0], ...feeds[1]].slice(0, 30);
  const trendMap = new Map(trends.map(item => [item.trend_key, item]));
  const prompt = 'Today is ' + today + ' Pakistan time. These are Google Trends RSS topics from Pakistan and India. Select exactly five distinct overall popular news stories across both countries, all categories eligible. Prioritize Google feed order and approximate traffic, avoid trivial or duplicate topics, and use each exact trend_key. Verify every story using Google Search and a reputable current news publisher. A search trend alone is not proof of a news event. Do not invent facts. Prefer Reuters, AP, BBC, Dawn, The News, Express Tribune, Geo, Indian Express, The Hindu, Hindustan Times, NDTV or another credible outlet. Write concise English headlines and factual summaries plus accurate Urdu translations. source_url must be a direct article URL. image_url may be empty. Return JSON only. INPUT: ' + JSON.stringify(trends);
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(MODEL) + ':generateContent', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: {
        type: 'array', minItems: 5, maxItems: 5,
        items: { type: 'object', properties: {
          trend_key: { type: 'string' }, category: { type: 'string' }, title_en: { type: 'string' }, title_ur: { type: 'string' },
          excerpt_en: { type: 'string' }, excerpt_ur: { type: 'string' }, source_name: { type: 'string' }, source_url: { type: 'string' },
          image_url: { type: 'string' }, daily_rank: { type: 'integer' }
        }, required: ['trend_key','category','title_en','title_ur','excerpt_en','excerpt_ur','source_name','source_url','daily_rank'] }
      }}
    }),
    signal: AbortSignal.timeout(45000)
  });
  const data = await body(response);
  if (!response.ok) throw Error(data?.error?.message || 'Gemini could not verify popular trends.');
  let selected;
  try { selected = JSON.parse(data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('') || ''); }
  catch { throw Error('Gemini returned invalid popular-news JSON.'); }
  if (!Array.isArray(selected) || selected.length !== 5) throw Error('Gemini did not return five popular stories.');
  const seenKeys = new Set(), seenSources = new Set();
  const stories = selected.map(item => {
    const trend = trendMap.get(String(item.trend_key || '')), source = https(item.source_url), rank = Number(item.daily_rank);
    if (!trend || !source || !item.title_en || !item.title_ur || !item.excerpt_en || !item.excerpt_ur || !item.source_name || !Number.isInteger(rank) || rank < 1 || rank > 5) throw Error('A popular story is incomplete or does not match a Google trend.');
    if (seenKeys.has(trend.trend_key) || seenSources.has(source)) throw Error('Popular news contains a duplicate trend or article.');
    seenKeys.add(trend.trend_key); seenSources.add(source);
    return {
      trend_date: today, trend_key: trend.trend_key, country: trend.country, google_query: trend.google_query,
      approx_traffic: trend.approx_traffic || null, category: String(item.category || 'Top News').slice(0, 50),
      title_en: String(item.title_en).slice(0, 180), title_ur: String(item.title_ur).slice(0, 180),
      excerpt_en: String(item.excerpt_en).slice(0, 650), excerpt_ur: String(item.excerpt_ur).slice(0, 650),
      source_name: String(item.source_name).slice(0, 100), source_url: source,
      image_url: https(item.image_url) || trend.articles.find(article => article.url === source)?.image || trend.articles[0]?.image || null,
      daily_rank: rank, is_published: true, updated_at: new Date().toISOString()
    };
  }).sort((a, b) => a.daily_rank - b.daily_rank);
  if (stories.some((item, index) => item.daily_rank !== index + 1)) throw Error('Popular stories did not receive a unique complete ranking.');
  for (const story of stories) story.image_url = await popularImage(story.source_url) || story.image_url;
  const keys = stories.map(item => item.trend_key);
  const keep = '("' + keys.map(value => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')).join('","') + '")';
  const saved = await db('popular_news?on_conflict=trend_date,trend_key', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(stories)
  });
  if (!saved.ok) throw Error('Could not save the daily popular-news snapshot.');
  const hide = await db('popular_news?trend_date=eq.' + today + '&trend_key=not.in.' + encodeURIComponent(keep), {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ is_published: false })
  });
  if (!hide.ok) throw Error('Could not retire old popular-news trends.');
  const show = await db('popular_news?trend_date=eq.' + today + '&trend_key=in.' + encodeURIComponent(keep), {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ is_published: true })
  });
  if (!show.ok) throw Error('Could not publish the new popular-news snapshot.');
  const check = await db('popular_news?trend_date=eq.' + today + '&is_published=eq.true&select=trend_key,daily_rank,title_en,title_ur,source_url&order=daily_rank.asc');
  const rows = await body(check);
  if (!check.ok || !Array.isArray(rows) || rows.length !== 5 || rows.some((row, index) => Number(row.daily_rank) !== index + 1 || !row.title_en || !row.title_ur || !row.source_url)) throw Error('Popular-news read-back verification failed.');
  return { status: 'updated', count: rows.length };
}
async function safePopularNews(today) {
  try { return await syncPopularNews(today); }
  catch (error) {
    console.error(JSON.stringify({ event: 'popular-news-update', status: 'failed', date: today, message: error?.message || String(error) }));
    return { status: 'failed', error: error?.message || 'Popular news update failed.' };
  }
}

module.exports = async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});const a=req.headers.authorization||'';if(!process.env.CRON_SECRET||a!==`Bearer ${process.env.CRON_SECRET}`)return res.status(401).json({error:'Unauthorized.'});try{const today=karachiDate(),edition=await current(today);if(edition.length===5&&edition.every((x,i)=>Number(x.daily_rank)===i+1&&x.title_en&&x.title_ur&&x.excerpt_en&&x.excerpt_ur&&x.image_url&&x.source_url)){const popularNews=await safePopularNews(today);return res.status(200).json({ok:true,status:'already-current',date:today,ranks:edition.map(x=>x.daily_rank),popularNews})}const stories=await generate(today),published=await write(today,stories),popularNews=await safePopularNews(today);console.log(JSON.stringify({event:'daily-news-update',status:'success',date:today,count:published.length}));return res.status(200).json({ok:true,status:'updated',date:today,ranks:published.map(x=>x.daily_rank),popularNews})}catch(e){console.error(JSON.stringify({event:'daily-news-update',status:'failed',message:e?.message||String(e)}));return res.status(500).json({ok:false,status:'failed',error:e?.message||'Daily news update failed.'})}}