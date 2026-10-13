const webpush = require('web-push');
function cfg(){const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;const publicKey=String(process.env.VAPID_PUBLIC_KEY||'').trim();const privateKey=String(process.env.VAPID_PRIVATE_KEY||'').trim();const subject=String(process.env.VAPID_SUBJECT||'').trim();if(!url||!key||!publicKey||!privateKey||!subject)return null;return{url,key,publicKey,privateKey,subject};}
async function db(config,path,init={}){const headers=new Headers(init.headers||{});headers.set('apikey',config.key);headers.set('Authorization','Bearer '+config.key);if(init.body&&!headers.has('content-type'))headers.set('content-type','application/json');return fetch(config.url+'/rest/v1/'+path,{...init,headers});}
async function removeSubscription(config,endpoint){try{await db(config,'news_push_subscriptions?endpoint=eq.'+encodeURIComponent(endpoint),{method:'DELETE',headers:{Prefer:'return=minimal'}})}catch{}}
function payloadFor(story,language,edition){
 const isUr=language==='ur',many=Array.isArray(story);
 const title=isUr?'پنجابی نیوز ورک اسپیس':'Punjabi News Workspace';
 const body=many?(isUr?'آج کی تازہ خبریں شائع ہو گئی ہیں۔ پڑھنے کے لیے ٹیپ کریں۔':"Today's news is published. Tap to read the latest stories."):isUr?('نئی خبر شائع ہوئی ہے: '+String(story.title_ur||'').slice(0,120)):('New story published: '+String(story.title_en||'').slice(0,120));
 return {title,body,url:'/?date='+encodeURIComponent(edition),icon:'/logo.svg',tag:many?'pnw-news-edition-'+edition:'pnw-news-story-'+String(story.id||Date.now())};
}
async function notifyNewsPublished(story){
 const config=cfg();if(!config)return{sent:0,skipped:true};
 try{
  webpush.setVapidDetails(config.subject,config.publicKey,config.privateKey);
  let offset=0,sent=0;
  while(true){
   const r=await db(config,'news_push_subscriptions?select=endpoint,p256dh,auth,language&order=id.asc&limit=250&offset='+offset);
   if(!r.ok)throw Error('Could not read push subscriptions.');
   const rows=await r.json();if(!Array.isArray(rows)||!rows.length)break;
   for(let i=0;i<rows.length;i+=25){
    const batch=rows.slice(i,i+25);
    const results=await Promise.allSettled(batch.map(async sub=>{
     const payload=payloadFor(story,sub.language,Array.isArray(story)?(story[0]?.published_on||''): (story.published_on||''));
     try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify(payload),{TTL:3600,urgency:'normal'});sent++}
     catch(e){if(e?.statusCode===404||e?.statusCode===410)await removeSubscription(config,sub.endpoint);else throw e;}
    }));
    const failures=results.filter(x=>x.status==='rejected').length;
    if(failures)console.warn(JSON.stringify({event:'news-push-batch',failures}));
   }
   if(rows.length<250)break;offset+=rows.length;
  }
  return{sent,skipped:false};
 }catch(e){console.error(JSON.stringify({event:'news-push-failed',message:e?.message||String(e)}));return{sent:0,skipped:false,error:true};}
}
module.exports={notifyNewsPublished};
