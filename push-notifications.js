(function(){'use strict';
const button=document.getElementById('notificationToggle');
if(!button)return;
const API='/api/push-subscriptions';
let busy=false,configured=false;
const isUr=()=>document.documentElement.lang==='ur';
const labels={on:{en:'Alerts on',ur:'اطلاعات آن'},off:{en:'News alerts',ur:'خبروں کی اطلاع'},unsupported:{en:'Alerts unavailable',ur:'اطلاعات دستیاب نہیں'},denied:{en:'Allow in settings',ur:'سیٹنگز میں اجازت دیں'}};
function setLabel(state){const lang=isUr()?'ur':'en';button.textContent=labels[state][lang];button.setAttribute('aria-label',lang==='ur'?'خبروں کی اطلاعات آن یا آف کریں':'Turn news notifications on or off');button.setAttribute('aria-pressed',state==='on'?'true':'false');}
function message(en,ur){const text=isUr()?ur:en;const toast=document.getElementById('toast');if(toast){toast.textContent=text;toast.className='toast';toast.classList.remove('hidden');clearTimeout(window.__pnwPushToastTimer);window.__pnwPushToastTimer=setTimeout(()=>toast.classList.add('hidden'),4500)}else window.alert(text);}
function b64ToBytes(value){const padded=value+'='.repeat((4-value.length%4)%4);const raw=atob(padded.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function getConfig(){const r=await fetch('/api/push-config',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Notification configuration unavailable');return d;}
async function currentSubscription(){if(!('serviceWorker'in navigator)||!('PushManager'in window))return null;const reg=await navigator.serviceWorker.getRegistration('/');return reg?reg.pushManager.getSubscription():null;}
async function updateState(){if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)){button.disabled=true;setLabel('unsupported');button.title='This browser does not support web push notifications.';return;}
try{const cfg=await getConfig();configured=!!cfg.configured;if(!configured){button.disabled=true;setLabel('unsupported');button.title=isUr()?'سرور پر نوٹیفکیشن کی کنفیگریشن ابھی مکمل نہیں۔':'Server-side push keys are not configured yet.';return;}
button.disabled=false;const sub=await currentSubscription();if(Notification.permission==='denied'){setLabel('denied');button.title=isUr()?'براؤزر سیٹنگز میں اجازت تبدیل کریں۔':'Change notification permission in your browser settings.';}else if(sub&&Notification.permission==='granted'){setLabel('on');button.title=isUr()?'خبروں کی اطلاعات آن ہیں۔':'News notifications are enabled.';}else{setLabel('off');button.title=isUr()?'نئی خبروں کی اطلاع آن کریں۔':'Turn on notifications for newly published news.';}
}catch{button.disabled=true;setLabel('unsupported');button.title='News notifications could not be configured.'}}
async function enable(){if(Notification.permission==='denied'){message('Notifications are blocked. Open your browser/site settings and allow notifications first.','اطلاعات بلاک ہیں۔ براؤزر یا سائٹ سیٹنگز میں جا کر اجازت دیں۔');return;}
const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(permission!=='granted'){message('Notification permission was not granted.','اطلاعات کی اجازت نہیں دی گئی۔');await updateState();return;}
const cfg=await getConfig();if(!cfg.configured||!cfg.publicKey)throw new Error('Server-side push keys are not configured.');
const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(cfg.publicKey)});
const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),language:isUr()?'ur':'en'})});
const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Could not save your notification preference.');
setLabel('on');button.title='News notifications are enabled.';message('News notifications are on. We’ll alert you when new news is published.','خبروں کی اطلاعات آن ہو گئی ہیں۔ نئی خبر شائع ہونے پر آپ کو اطلاع ملے گی۔');
}
async function disable(){const sub=await currentSubscription();if(sub){try{await fetch(API,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})})}finally{await sub.unsubscribe().catch(()=>{})}}setLabel('off');message('News notifications are turned off.','خبروں کی اطلاعات بند کر دی گئی ہیں۔');}
button.addEventListener('click',async()=>{if(busy)return;busy=true;button.disabled=true;try{const sub=await currentSubscription();if(sub&&Notification.permission==='granted')await disable();else await enable();}catch(e){message(e?.message||'Could not update notification settings.','اطلاعات کی سیٹنگ تبدیل نہیں ہو سکی۔');}finally{busy=false;await updateState();}});
window.addEventListener('languagechange',updateState);
window.addEventListener('pnw:language-changed',updateState);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateState,{once:true});else updateState();
})();