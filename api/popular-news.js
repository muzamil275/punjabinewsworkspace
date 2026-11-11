const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');
function minusDays(date, days) { const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10); }
function traffic(v) { const s=String(v||'').toUpperCase(),n=parseFloat(s.replace(/,/g,''));return Number.isFinite(n)?n*(s.includes('M')?1e6:s.includes('K')?1e3:1):0; }
function norm(v) { return String(v||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(); }
function aggregate(rows) {
 const groups=new Map();
 for(const row of rows){const k=norm(row.google_query);if(!k)continue;const x=groups.get(k)||{...row,countries:new Set(),trend_count:0,rank_score:0,traffic_score:0,latest_date:row.trend_date};
 x.countries.add(row.country);x.trend_count++;x.rank_score+=Math.max(1,6-Number(row.daily_rank||5));x.traffic_score+=traffic(row.approx_traffic);
 if(row.trend_date>x.latest_date)Object.assign(x,{latest_date:row.trend_date,title_en:row.title_en,title_ur:row.title_ur,excerpt_en:row.excerpt_en,excerpt_ur:row.excerpt_ur,category:row.category,source_name:row.source_name,source_url:row.source_url,image_url:row.image_url,country:row.country});
 groups.set(k,x);}
 return [...groups.values()].map(x=>({...x,countries:[...x.countries]})).sort((a,b)=>b.trend_count-a.trend_count||b.rank_score-a.rank_score||b.traffic_score-a.traffic_score).slice(0,5);
}
module.exports=async(req,res)=>{cors(req,res);if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='GET')return json(res,{error:'Method not allowed.'},405);
 const window=String(req.query?.window||'24h');if(!['24h','7d'].includes(window))return json(res,{error:'Use window=24h or window=7d.'},400);
 try{const today=karachiDate(),start=minusDays(today,6),r=await supabaseFetch('popular_news?is_published=eq.true&trend_date=gte.'+encodeURIComponent(start)+'&select=trend_date,country,google_query,approx_traffic,category,title_en,title_ur,excerpt_en,excerpt_ur,source_name,source_url,image_url,daily_rank,created_at&order=trend_date.desc,daily_rank.asc&limit=100'),rows=await dbJson(r);
 if(!r.ok)return json(res,{error:'Popular news is temporarily unavailable.'},503);const all=Array.isArray(rows)?rows:[];if(!all.length)return json(res,{window,stories:[],updated_at:null,date:null});
 const latest=all[0].trend_date,stories=window==='24h'?all.filter(x=>x.trend_date===latest).sort((a,b)=>a.daily_rank-b.daily_rank).slice(0,5).map(x=>({...x,countries:[x.country],trend_count:1})):aggregate(all);
 const time=all.reduce((m,x)=>Math.max(m,Date.parse(x.created_at||'')||0),0);return json(res,{window,stories,date:latest,updated_at:time?new Date(time).toISOString():null,range_start:window==='7d'?start:latest,range_end:latest});
 }catch(e){return json(res,{error:e.message||'Popular news request failed.'},500);}};