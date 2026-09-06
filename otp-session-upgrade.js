(()=>{
  'use strict';
  const c=window.PNW_CONFIG||{};
  const SKEY='pnw_session_started_at';
  const MODE='pnw_mode';
  const TOKEN='pnw_token';
  const REFRESH='pnw_refresh_token';
  const SUPA=()=>String(c.SUPABASE_URL||'').replace(/\/$/,'');
  const key='pnw_otp_state';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
  const q=s=>document.querySelector(s);
  const toast=(t,kind='')=>{const e=q('#toast');if(!e)return;e.textContent=t;e.className=`toast ${kind}`;e.classList.remove('hidden');clearTimeout(window.__otpToast);window.__otpToast=setTimeout(()=>e.classList.add('hidden'),4200)};
  const started=()=>Number(localStorage.getItem(SKEY)||0);
  async function expireSession(){const token=localStorage.getItem(TOKEN)||'';try{if(token)await fetch(`${SUPA()}/auth/v1/logout`,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`}})}catch{}localStorage.removeItem(TOKEN);localStorage.removeItem(REFRESH);localStorage.removeItem(SKEY);localStorage.removeItem(MODE);location.reload();}
  function enforceSession(){const t=started();if(!localStorage.getItem(TOKEN))return;if(!t){localStorage.setItem(SKEY,String(Date.now()));return}const left=5*60*60*1000-(Date.now()-t);if(left<=0)return expireSession();clearTimeout(window.__otpSessionTimer);window.__otpSessionTimer=setTimeout(expireSession,left+250);}
  async function me(){const token=localStorage.getItem(TOKEN)||'';if(!token)return null;const r=await fetch(`${c.API_URL||'/api'}/me`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});if(!r.ok)throw Error('Session unavailable.');return r.json();}
  function modal(html){const r=q('#modalRoot');if(!r)return; r.innerHTML=`<div class="modal otp-modal" role="dialog" aria-modal="true" aria-labelledby="otpTitle"><button class="close" type="button" aria-label="Close">×</button>${html}</div>`;r.classList.remove('hidden');r.setAttribute('aria-hidden','false');r.querySelector('.close').onclick=()=>{r.classList.add('hidden');r.setAttribute('aria-hidden','true');r.innerHTML=''};}
  function otpStorage(v){try{sessionStorage.setItem(key,JSON.stringify(v))}catch{}}
  function otpRead(){try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}}
  async function sendOtp(channel,identifier){
    const payload=channel==='email'?{email:identifier,create_user:true}:{phone:identifier,create_user:true,...(channel==='whatsapp'?{channel:'whatsapp'}:{})};
    const r=await fetch(`${SUPA()}/auth/v1/otp`,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.msg||d.error_description||d.message||'Unable to send OTP.');
    otpStorage({channel,identifier,sentAt:Date.now()});
  }
  function loginChoices(){modal(`<span class="auth-premium-kicker">SECURE LOGIN</span><h2 id="otpTitle">Sign in with a code</h2><p>Choose where to receive your 6-digit code. Existing and new users can use the same flow.</p><div class="otp-choice-grid"><button class="secondary otp-channel" data-channel="email" type="button">Email code</button><button class="secondary otp-channel" data-channel="sms" type="button">SMS code</button><button class="secondary otp-channel" data-channel="whatsapp" type="button">WhatsApp code</button></div><p class="otp-note">Code expires in 2 minutes.</p>`);document.querySelectorAll('.otp-channel').forEach(b=>b.onclick=()=>otpRequest(b.dataset.channel));}
  function otpRequest(channel){
    const label=channel==='email'?'Email address':'Mobile number';
    const type=channel==='email'?'email':'tel';
    const placeholder=channel==='email'?'you@example.com':'+92 300 1234567';
    modal(`<span class="auth-premium-kicker">${channel==='email'?'EMAIL':'PHONE'}</span><h2 id="otpTitle">Get your 6-digit code</h2><form id="otpSendForm"><label>${label}<input name="identifier" type="${type}" inputmode="${type==='tel'?'tel':'email'}" placeholder="${placeholder}" required autocomplete="${type==='tel'?'tel':'email'}"></label><button class="primary" type="submit">Send code</button></form><button class="footer-link" type="button" data-otp-back>Use another method</button><p class="otp-note">Code expires in 2 minutes.</p>`);q('#otpSendForm').onsubmit=async e=>{e.preventDefault();const id=String(new FormData(e.currentTarget).get('identifier')).trim();if(!id)return;try{await sendOtp(channel,id);otpVerify()}catch(x){toast(x.message,'error')}};q('[data-otp-back]').onclick=loginChoices;
  }
  async function verifyOtp(channel,identifier,token){
    const body=channel==='email'?{type:'email',token,email:identifier}:{type:'sms',token,phone:identifier};
    const r=await fetch(`${SUPA()}/auth/v1/verify`,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));if(!r.ok||!d.access_token)throw Error(d.msg||d.error_description||d.message||'Invalid or expired code.');return d;
  }
  function otpVerify(){const s=otpRead();if(!s)return loginChoices();const age=Math.max(0,Date.now()-Number(s.sentAt||0));if(age>=120000)return otpRequest(s.channel);modal(`<span class="auth-premium-kicker">VERIFY</span><h2 id="otpTitle">Enter your 6-digit code</h2><p>We sent a code to <b>${esc(s.identifier)}</b>.</p><form id="otpVerifyForm"><label>6-digit code<input name="token" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" minlength="6" pattern="\\d{6}" placeholder="123456" required></label><button class="primary" type="submit">Verify & sign in</button></form><div class="otp-timer" id="otpTimer" aria-live="polite"></div><button class="footer-link" type="button" data-otp-resend>Resend code</button><button class="footer-link" type="button" data-otp-back>Use another method</button>`);const timer=q('#otpTimer');const tick=()=>{const remain=Math.max(0,120000-(Date.now()-Number(s.sentAt||0)));const sec=Math.ceil(remain/1000);timer.textContent=remain?`Code expires in ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`:'Code expired. Request a new code.';if(remain)window.__otpExpiry=setTimeout(tick,250)};tick();q('#otpVerifyForm').onsubmit=async e=>{e.preventDefault();const token=String(new FormData(e.currentTarget).get('token')).trim();if(!/^\d{6}$/.test(token))return toast('Enter exactly 6 digits.','error');if(Date.now()-Number(s.sentAt||0)>=120000)return toast('That code has expired. Request a new one.','error');try{const d=await verifyOtp(s.channel,s.identifier,token);localStorage.setItem(TOKEN,d.access_token);if(d.refresh_token)localStorage.setItem(REFRESH,d.refresh_token);localStorage.setItem(SKEY,String(Date.now()));sessionStorage.removeItem(key);const info=await fetch(`${c.API_URL||'/api'}/me`,{headers:{Authorization:`Bearer ${d.access_token}`},cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);localStorage.setItem(MODE,info?.subscription?.active||info?.user?.isOwner?'premium':'basic');window.__otpVerified=true;location.reload()}catch(x){toast(x.message,'error')}};q('[data-otp-resend]').onclick=()=>otpRequest(s.channel);q('[data-otp-back]').onclick=loginChoices;}
  function intercept(){document.addEventListener('click',e=>{const account=e.target.closest?.('#accountButton');const subscribe=e.target.closest?.('[data-action="subscribe"]');if(account){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();loginChoices();return}if(subscribe&&!localStorage.getItem(TOKEN)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();loginChoices();}},true)}
  async function premiumDefault(){try{const token=localStorage.getItem(TOKEN);if(!token)return;const info=await me();const premium=!!(info?.user?.isOwner||info?.subscription?.active);localStorage.setItem(MODE,premium?'premium':'basic');if(premium){const b=q('.mode-pill[data-mode="premium"]');if(b){setTimeout(()=>b.click(),0)}}}catch{localStorage.setItem(MODE,'basic')}}
  function migration(){const token=localStorage.getItem(TOKEN);if(token&&!started())localStorage.setItem(SKEY,String(Date.now()));enforceSession()}
  intercept();migration();
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{premiumDefault();const s=otpRead();if(s&&Date.now()-Number(s.sentAt||0)>=120000)sessionStorage.removeItem(key)}):(premiumDefault());
})();
