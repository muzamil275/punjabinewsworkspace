const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
function safeUrl(value) { try { const u=new URL(String(value||'')); return u.protocol==='https:'?u.toString():null; } catch { return null; } }
function trendDecode(value) { return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").trim(); }
function trendTag(xml,name) {
 const re=new RegExp('<(?:[\\w-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+name+'\\s*>','i'),m=xml.match(re);
 return m?trendDecode(m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')):'';
}
function trendSlug(value) { return String(value||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,100); }
async function trendFeed(code,country) {
 const response=await fetch('https://trends.google.com/trending/rss?geo='+code,{headers:{'User-Agent':'PunjabiNewsWorkspace/1.0','Accept':'application/rss+xml, application/xml'},signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error('Google Trends '+code+' returned HTTP '+response.status);
 const xml=await response.text(),blocks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
 const rows=blocks.map(block=>{
  const query=trendTag(block,'title'),parts=block.match(/<(?:[\w-]+:)?news_item(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w-]+:)?news_item>/gi)||[];
  const articles=parts.map(item=>({title:trendTag(item,'news_item_title'),url:safeUrl(trendTag(item,'news_item_url')),image:safeUrl(trendTag(item,'news_item_picture'))})).filter(x=>x.title&&x.url);
  return query?{trend_key:code+':'+trendSlug(query),country,google_query:query,approx_traffic:trendTag(block,'approx_traffic'),articles}:null;
 }).filter(Boolean);
 if(!rows.length)throw Error('Google Trends '+code+' feed was empty.');
 return rows;
}
async function readJson(response) { return response.json().catch(()=>({})); }
function supabaseCredentials() {
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Supabase server secret is not configured.');
 return {url:url.replace(/\/$/,''),key};
}
async function database(path,init={}) {
 const c=supabaseCredentials(),headers=new Headers(init.headers||{});
 headers.set('apikey',c.key);headers.set('Authorization','Bearer '+c.key);
 if(init.body)headers.set('content-type','application/json');
 return fetch(c.url+'/rest/v1/'+path,{...init,headers});
}
async function articleImage(link) {
 try {
  const response=await fetch(link,{headers:{'User-Agent':'Mozilla/5.0 (compatible; PunjabiNewsWorkspace/1.0)'},signal:AbortSignal.timeout(7000)});
  if(!response.ok)return null;
  const html=await response.text();
  for(const re of [/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i]) {
   const match=html.match(re),image=safeUrl(match&&match[1]);if(image)return image;
  }
 } catch {}
 return null;
}
async function syncPopularNews(today) {
 const apiKey=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;
 if(!apiKey)throw Error('Gemini API key is not configured for popular news.');
 const feeds=await Promise.all([trendFeed('PK','Pakistan'),trendFeed('IN','India')]);
 const trends=[...feeds[0],...feeds[1]].slice(0,30),trendMap=new Map(trends.map(item=>[item.trend_key,item]));
 const prompt='Today is '+today+' Pakistan time. These are Google Trends RSS topics from Pakistan and India. Select exactly five distinct overall popular news stories across both countries, all categories eligible. Prioritize Google feed order and approximate traffic, avoid trivial or duplicate topics, and use each exact trend_key. Verify every story using Google Search and a reputable current news publisher. A search trend alone is not proof of a news event. Do not invent facts. Prefer Reuters, AP, BBC, Dawn, The News, Express Tribune, Geo, Indian Express, The Hindu, Hindustan Times, NDTV or another credible outlet. Write concise English headlines and factual summaries plus accurate Urdu translations. source_url must be a direct article URL. image_url may be empty. Return JSON only. INPUT: '+JSON.stringify(trends);
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(MODEL)+':generateContent',{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
  body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{responseMimeType:'application/json',responseSchema:{
   type:'array',minItems:5,maxItems:5,items:{type:'object',properties:{
    trend_key:{type:'string'},category:{type:'string'},title_en:{type:'string'},title_ur:{type:'string'},
    excerpt_en:{type:'string'},excerpt_ur:{type:'string'},source_name:{type:'string'},source_url:{type:'string'},
    image_url:{type:'string'},daily_rank:{type:'integer'}
   },required:['trend_key','category','title_en','title_ur','excerpt_en','excerpt_ur','source_name','source_url','daily_rank']}
  }}),signal:AbortSignal.timeout(45000)
 });
 const result=await readJson(response);
 if(!response.ok)throw Error(result?.error?.message||'Gemini could not verify popular trends.');
 let selected;try{selected=JSON.parse(result?.candidates?.[0]?.content?.parts?.map(x=>x?.text||'').join('')||'');}catch{throw Error('Gemini returned invalid popular-news JSON.');}
 if(!Array.isArray(selected)||selected.length!==5)throw Error('Gemini did not return five popular stories.');
 const seenKeys=new Set(),seenSources=new Set();
 const stories=selected.map(item=>{
  const trend=trendMap.get(String(item.trend_key||'')),source=safeUrl(item.source_url),rank=Number(item.daily_rank);
  if(!trend||!source||!item.title_en||!item.title_ur||!item.excerpt_en||!item.excerpt_ur||!item.source_name||!Number.isInteger(rank)||rank<1||rank>5)throw Error('A popular story is incomplete or does not match a Google trend.');
  if(seenKeys.has(trend.trend_key)||seenSources.has(source))throw Error('Popular news contains a duplicate trend or article.');
  seenKeys.add(trend.trend_key);seenSources.add(source);
  return {trend_date:today,trend_key:trend.trend_key,country:trend.country,google_query:trend.google_query,approx_traffic:trend.approx_traffic||null,
   category:String(item.category||'Top News').slice(0,50),title_en:String(item.title_en).slice(0,180),title_ur:String(item.title_ur).slice(0,180),
   excerpt_en:String(item.excerpt_en).slice(0,650),excerpt_ur:String(item.excerpt_ur).slice(0,650),source_name:String(item.source_name).slice(0,100),
   source_url:source,image_url:safeUrl(item.image_url)||trend.articles.find(a=>a.url===source)?.image||trend.articles[0]?.image||null,daily_rank:rank,is_published:true,updated_at:new Date().toISOString()};
 }).sort((a,b)=>a.daily_rank-b.daily_rank);
 if(stories.some((item,index)=>item.daily_rank!==index+1))throw Error('Popular stories did not receive a complete unique ranking.');
 await Promise.all(stories.map(async story=>{story.image_url=await articleImage(story.source_url)||story.image_url;}));
 const keys=stories.map(x=>x.trend_key),keep='("'+keys.map(x=>x.replace(/\\/g,'\\\\').replace(/"/g,'\\"')).join('","')+'")';
 const saved=await database('popular_news?on_conflict=trend_date,trend_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(stories)});
 if(!saved.ok)throw Error('Could not save the daily popular-news snapshot.');
 const hide=await database('popular_news?trend_date=eq.'+today+'&trend_key=not.in.'+encodeURIComponent(keep),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({is_published:false})});
 if(!hide.ok)throw Error('Could not retire old popular-news trends.');
 const show=await database('popular_news?trend_date=eq.'+today+'&trend_key=in.'+encodeURIComponent(keep),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({is_published:true})});
 if(!show.ok)throw Error('Could not publish the new popular-news snapshot.');
 const check=await database('popular_news?trend_date=eq.'+today+'&is_published=eq.true&select=trend_key,daily_rank,title_en,title_ur,source_url&order=daily_rank.asc');
 const rows=await readJson(check);
 if(!check.ok||!Array.isArray(rows)||rows.length!==5||rows.some((x,i)=>Number(x.daily_rank)!==i+1||!x.title_en||!x.title_ur||!x.source_url))throw Error('Popular-news read-back verification failed.');
 return {status:'updated',date:today,count:rows.length};
}
module.exports={syncPopularNews};