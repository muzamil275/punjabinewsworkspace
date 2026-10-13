const { json, cors } = require('../lib/api');
const WINDOW=60*1000,LIMIT=20;
const rates=global.__pnwPushSubRates||(global.__pnwPushSubRates=new Map());
function allowedOrigin(req){const origin=String(req.headers.origin||'');const expected=String(process.env.FRONTEND_ORIGIN||'');return !origin||!expected||origin===expected;}
function serviceConfig(){const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Server-side database credentials are not configured.');return{url,key};}
async function db(path,init={}){const {url,key}=serviceConfig(),headers=new Headers(init.headers||{});headers.set('apikey',key);headers.set('Authorization','Bearer '+key);if(init.body&&!headers.has('content-type'))headers.set('content-type','application/json');return fetch(url+'/rest/v1/'+path,{...init,headers});}
function clientIp(req){return String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'unknown').split(',')[0].trim();}
function rateLimit(req){const now=Date.now(),ip=clientIp(req),old=rates.get(ip);if(!old||now-old.start>=WINDOW){rates.set(ip,{start:now,count:1});return false;}old.count++;return old.count>LIMIT;}
function validEndpoint(v){try{const u=new URL(String(v||''));return u.protocol==='https:'&&u.hostname.length>0&&u.href.length<4096?u.href:null;}catch{return null;}}
module.exports=async function handler(req,res){
 cors(req,res);res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(!allowedOrigin(req))return json(res,{error:'Origin not allowed.'},403);
 if(!['POST','DELETE'].includes(req.method))return json(res,{error:'Method not allowed.'},405);
 if(rateLimit(req)){res.setHeader('Retry-After','60');return json(res,{error:'Too many subscription requests. Try again shortly.'},429);}
 try{
  const body=req.body&&typeof req.body==='object'?req.body:{};
  const endpoint=validEndpoint(req.method==='DELETE'?body.endpoint:body.subscription?.endpoint);
  if(!endpoint)return json(res,{error:'A valid HTTPS push endpoint is required.'},422);
  if(req.method==='POST'){
   const sub=body.subscription,keys=sub?.keys;
   if(!keys||typeof keys.p256dh!=='string'||typeof keys.auth!=='string'||keys.p256dh.length>256||keys.auth.length>256)return json(res,{error:'Invalid push subscription keys.'},422);
   const language=body.language==='ur'?'ur':'en';
   const r=await db('news_push_subscriptions?on_conflict=endpoint',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({endpoint,p256dh:keys.p256dh,auth:keys.auth,language,updated_at:new Date().toISOString()})});
   if(!r.ok)return json(res,{error:'Could not save the subscription. Apply the web-push database migration first.'},503);
   return json(res,{ok:true},201);
  }
  const r=await db('news_push_subscriptions?endpoint=eq.'+encodeURIComponent(endpoint),{method:'DELETE',headers:{Prefer:'return=minimal'}});
  if(!r.ok)return json(res,{error:'Could not remove the subscription.'},503);
  return json(res,{ok:true});
 }catch(e){return json(res,{error:e?.message||'Push subscription request failed.'},500);}
};
