(() => {
'use strict';
const EMAIL='muzamil.275pk@gmail.com', FALLBACK_IMAGE='/news-images/fallback.svg', GEMINI_HISTORY_KEY='pnw_gemini_history_v2';
const qs=s=>document.querySelector(s), lang=()=>localStorage.getItem('pnw_language')||'en', isUrdu=()=>lang()==='ur';
const esc=v=>String(v??'').replace(/[&<>\"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
const fmtDate=d=>new Date(`${d}T12:00:00`).toLocaleDateString(isUrdu()?'ur-PK':'en-PK',{dateStyle:'medium'});
const state={dates:[],selected:null,loading:false,posts:[],geminiHistory:[],latestNotice:null};
const newsTop=()=>qs('#today-heading')||qs('.news-section')||qs('#newsGrid');
function readGeminiHistory(){try{const raw=JSON.parse(localStorage.getItem(GEMINI_HISTORY_KEY)||'[]');return Array.isArray(raw)?raw.filter(x=>(x?.role==='user'||x?.role==='model')&&typeof x.text==='string').slice(-12):[]}catch{return[]}}
function saveGeminiHistory(){try{localStorage.setItem(GEMINI_HISTORY_KEY,JSON.stringify(state.geminiHistory.slice(-12)))}catch{}}
function installLayout(){if(qs('#pnw-layout-fixes'))return;const s=document.createElement('style');s.id='pnw-layout-fixes';s.textContent=`html{scroll-behavior:smooth;scroll-padding-top:92px}#newsGrid,#premiumGrid{scroll-margin-top:92px}.news-grid,.premium-grid{overflow:visible}.news-pager{display:flex!important;align-items:stretch;justify-content:center;flex-wrap:wrap;gap:8px;width:100%;max-width:100%;box-sizing:border-box;margin:0 0 22px;padding:0 2px;position:relative;z-index:5}.news-pager .news-page{display:inline-flex;flex:0 1 auto;min-width:54px;min-height:44px;box-sizing:border-box;align-items:center;justify-content:center;gap:4px;padding:7px 9px;white-space:nowrap}.news-pager .news-page span{font-weight:900;line-height:1}.news-pager .news-page small{font-size:.65rem;line-height:1.05}.news-pager .news-page.active{font-weight:900}#newsGrid,#premiumGrid{scroll-margin-top:92px}.news-grid,.premium-grid{overflow:visible}.news-card .news-image-wrap{width:100%;display:flex;justify-content:center;align-items:center;margin:0 0 20px;overflow:hidden;background:var(--card,#fbf9f4)}.news-card .news-image-wrap img{display:block;width:100%!important;max-width:100%!important;height:auto!important;aspect-ratio:16/9;object-fit:cover!important;object-position:center center!important;margin:0!important;position:static!important}.premium-card .news-image-wrap{display:flex;justify-content:center;background:var(--premium-surface,#0b1018)}.premium-mode{overflow:visible}.premium-strip{scroll-margin-top:92px}body[data-mode="premium"] .premium-strip{display:none!important}body[data-mode="premium"] .site-header{background:rgba(5,7,11,.92);border-bottom-color:var(--premium-line);color:var(--premium-text);box-shadow:0 10px 35px rgba(0,0,0,.22)}body[data-mode="premium"] .main-nav a,body[data-mode="premium"] .text-button{color:var(--premium-muted)}body[data-mode="premium"] .main-nav a:hover,body[data-mode="premium"] .text-button:hover,body[data-mode="premium"] .main-nav a:focus-visible,body[data-mode="premium"] .text-button:focus-visible{color:var(--premium-text)}body[data-mode="premium"] .mode-switch{border-color:var(--premium-line);background:var(--premium-surface)}body[data-mode="premium"] .mode-pill{color:var(--premium-muted)}body[data-mode="premium"] .mode-pill.active{background:var(--premium-mango);color:#111;box-shadow:0 5px 18px rgba(255,181,46,.16)}body[data-mode="premium"] .pill{border-color:var(--premium-line);color:var(--premium-text);background:var(--premium-surface)}body[data-mode="premium"] .account-button{background:var(--premium-surface-2);border-color:var(--premium-line);color:var(--premium-text)}.workspace-overlay{max-height:calc(100dvh - 32px);overflow:auto;-webkit-overflow-scrolling:touch}.news-pager{scroll-margin-top:92px}.news-grid{visibility:hidden}.brand-logo{display:block;width:150px;height:40px;max-width:42vw;object-fit:contain}`;document.head.appendChild(s)}
function reveal(){const g=qs('#newsGrid');if(g)g.style.visibility='visible'}
function goToNewsTop(){const target=newsTop();if(!target)return;setTimeout(()=>{const header=qs('.site-header');const y=Math.max(0,target.getBoundingClientRect().top+window.scrollY-(header?.getBoundingClientRect().height||78)-12);window.scrollTo({top:y,behavior:'smooth'})},60)}
function goToPremiumNews(){const target=qs('#premiumGrid')||qs('#premiumMode');if(!target)return;setTimeout(()=>{const header=qs('.site-header');const y=Math.max(0,target.getBoundingClientRect().top+window.scrollY-(header?.getBoundingClientRect().height||78)-18);window.scrollTo({top:y,behavior:'smooth'})},60)}
function pager(){
let el=qs('#newsPager');const section=qs('.news-section'),grid=qs('#newsGrid');
if(!el){el=document.createElement('nav');el.id='newsPager';el.className='news-pager';el.setAttribute('aria-label','News editions');}
if(section&&grid&&el.parentNode!==section)section.insertBefore(el,grid);else if(section&&grid&&el.nextElementSibling!==grid)section.insertBefore(el,grid);
if(!state.dates.length){
 el.innerHTML='<button type="button" class="news-page retry-editions" id="retryEditions" aria-label="Retry loading news editions"><span>↻</span><small>Retry editions</small></button>';
 qs('#retryEditions')?.addEventListener('click',initEditions);
 return;
}
el.innerHTML=state.dates.map((date,i)=>`<button type="button" class="news-page ${date===state.selected?'active':''}" data-news-date="${esc(date)}" aria-label="News edition ${i+1}, ${esc(fmtDate(date))}" aria-current="${date===state.selected?'page':'false'}"><span>${i+1}</span><small>${esc(fmtDate(date))}</small></button>`).join('');
el.querySelectorAll('[data-news-date]').forEach(b=>b.addEventListener('click',()=>loadEdition(b.dataset.newsDate,true)));
}
function card(p,premium=false){const title=isUrdu()?p.title_ur:p.title_en,text=isUrdu()?p.excerpt_ur:p.excerpt_en,src=p.image_url||FALLBACK_IMAGE;const img=`<div class="news-image-wrap"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"></div>`;const source=p.source_url&&p.source_name?`<a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_name)}</a>`:esc(p.source_name||'');return `<article class="news-card ${premium?'premium-card':''} workspace-card" data-history-title="${esc(title)}">${img}<div class="card-top"><span class="rank">0${esc(p.daily_rank)}</span><span class="category">${esc(p.category)}</span></div><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="card-meta"><time>${esc(fmtDate(p.published_on))}</time>${source?`<span class="meta-dot">·</span><span>${source}</span>`:''}</div>${premium?'<span class="premium-tag">Premium mode</span>':''}</article>`}
function syncPremiumEdition(){if(document.body?.dataset.mode!=='premium')return;const grid=qs('#premiumGrid');if(!grid||grid.querySelector('.premium-gate')||!state.posts.length)return;grid.innerHTML=state.posts.map(p=>card(p,true)).join('')}
function renderGeminiHistory(){const box=qs('#geminiMessages');if(!box)return;if(!state.geminiHistory.length){box.innerHTML='<div class="gemini-empty">Ask for today\'s news, a summary of a story, or a comparison of the available workspace stories.</div>';return}box.innerHTML=state.geminiHistory.map(item=>`<div class="gemini-message ${item.role==='user'?'user':'assistant'}"><span class="gemini-role">${item.role==='user'?'You':'Gemini'}</span><div class="gemini-text">${esc(item.text).replace(/\n/g,'<br>')}</div></div>`).join('');box.scrollTop=box.scrollHeight}
function resetGemini(){state.geminiHistory=[];saveGeminiHistory();renderGeminiHistory();const p=qs('#geminiPrompt'),s=qs('#geminiStatus');if(p){p.value='';p.disabled=false}if(s)s.textContent='';qs('#geminiAsk')?.removeAttribute('disabled')}
function appendGemini(role,text){state.geminiHistory.push({role,text});state.geminiHistory=state.geminiHistory.slice(-12);saveGeminiHistory();renderGeminiHistory()}
async function syncGeminiAccess(){
const form=qs('#geminiForm'),prompt=qs('#geminiPrompt'),button=qs('#geminiAsk'),status=qs('#geminiStatus');
if(!form)return;
const token=localStorage.getItem('pnw_token')||'';
if(!token){form.classList.add('hidden');if(status)status.textContent='Sign in with active Premium access to use Gemini.';return false}
try{
 const r=await fetch('/api/me',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
 const d=await r.json().catch(()=>({}));
 const active=Boolean(d.user?.isOwner||d.subscription?.active);
 form.classList.toggle('hidden',!active);
 if(status)status.textContent=active?'':'Active Premium access is required for Gemini.';
 if(prompt)prompt.disabled=!active;
 if(button)button.disabled=!active;
 return active;
}catch{
 form.classList.add('hidden');
 if(status)status.textContent='Gemini is available with active Premium access.';
 return false;
}}
async function askGemini(e){e.preventDefault();const p=qs('#geminiPrompt'),b=qs('#geminiAsk'),value=p?.value.trim();if(!value||document.body?.dataset.mode!=='premium'||!(await syncGeminiAccess()))return;const history=state.geminiHistory.slice(-10);appendGemini('user',value);b?.setAttribute('disabled','disabled');if(p)p.disabled=true;try{const token=localStorage.getItem('pnw_token')||'',r=await fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({prompt:value,history}),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Gemini could not complete the request.');appendGemini('model',d.text||'Gemini returned an empty response.');window.dispatchEvent(new CustomEvent('pnw:gemini-asked',{detail:{prompt:value,response:d.text||'',newsDate:d.newsDate||state.selected}}));if(p)p.value=''}catch(error){state.geminiHistory=state.geminiHistory.filter((item,i)=>i<state.geminiHistory.length-1);saveGeminiHistory();renderGeminiHistory();appendGemini('model',error.message||'Gemini request failed.')}finally{b?.removeAttribute('disabled');if(p)p.disabled=false}}
async function loadEdition(date,shouldScroll=false){
if(!date||state.loading)return;
const previousSelected=state.selected;
state.loading=true;
state.selected=date;
pager();
const grid=qs('#newsGrid');
if(grid){grid.setAttribute('aria-busy','true');grid.innerHTML='<article class="loading-card skeleton-card"><span></span><span></span><span></span></article>'}
try{
 const r=await fetch(`/api/news?lang=${encodeURIComponent(lang())}&date=${encodeURIComponent(date)}`,{cache:'no-store'}),d=await r.json();
 if(!r.ok)throw new Error(d.error||'News unavailable');
 state.dates=Array.isArray(d.availableDates)?d.availableDates:state.dates;
 const posts=Array.isArray(d.posts)?d.posts:[];
 if(!posts.length&&!d.isLatestAvailable){
   state.posts=[];
   const fallback=previousSelected&&state.dates.includes(previousSelected)?previousSelected:(state.dates[0]||null);
   state.selected=fallback;
   pager();
   if(grid){
     grid.innerHTML='<div class="loading-card" role="status"><p>Edition unavailable — pick another date.</p><button class="secondary" type="button" id="retryEdition">Reload edition</button></div>';
     grid.setAttribute('aria-busy','false');
     reveal();
     qs('#retryEdition')?.addEventListener('click',()=>loadEdition(date,true));
   }
   const dateEl=qs('#newsDate');if(dateEl)dateEl.textContent='';
   if(fallback)localStorage.setItem('pnw_selected_news_date',fallback);else localStorage.removeItem('pnw_selected_news_date');
   syncPremiumEdition();
   return;
 }
 state.selected=d.date||date;
 state.posts=posts;
 pager();
 if(grid){
   grid.innerHTML=state.posts.map(p=>card(p)).join('')||'<div class="loading-card">No stories were published for this edition.</div>';
   grid.setAttribute('aria-busy','false');reveal();
 }
 const dateEl=qs('#newsDate');
 if(dateEl)dateEl.textContent=state.latestNotice===state.selected?`Latest edition: ${fmtDate(state.selected)}`:fmtDate(state.selected);
 state.latestNotice=null;
 localStorage.setItem('pnw_selected_news_date',state.selected);
 syncPremiumEdition();
 window.dispatchEvent(new CustomEvent('pnw:news-edition',{detail:{date:state.selected,posts:state.posts}}));
 if(shouldScroll){if(document.body?.dataset.mode==='premium')goToPremiumNews();else goToNewsTop()}
}catch(e){
 if(grid){
  grid.setAttribute('aria-busy','false');grid.style.visibility='visible';
  grid.innerHTML='<div class="loading-card error" role="alert"><div><p>Couldn’t load this edition.</p><span>Please try again.</span></div><button class="secondary" type="button" id="retryEdition">Retry</button></div>';
  qs('#retryEdition')?.addEventListener('click',()=>loadEdition(date,true));
 }
}finally{state.loading=false}
}
async function initEditions(){
try{
 const r=await fetch(`/api/news?lang=${encodeURIComponent(lang())}`,{cache:'no-store'}),d=await r.json();
 if(!r.ok){state.dates=[];pager();return}
 state.dates=Array.isArray(d.availableDates)?d.availableDates:[];
 const saved=localStorage.getItem('pnw_selected_news_date');
 const latest=saved&&state.dates.includes(saved)?saved:(d.date||state.dates[0]||null);
 state.selected=latest;
 state.latestNotice=!saved&&d.isLatestAvailable&&d.date?d.date:null;
 if(latest)localStorage.setItem('pnw_selected_news_date',latest);else localStorage.removeItem('pnw_selected_news_date');
 pager();
 if(latest)await loadEdition(latest,false);else reveal();
}catch{
 state.dates=[];state.selected=null;pager();reveal();
}}
function startGeminiGate(){syncGeminiAccess();window.addEventListener('storage',syncGeminiAccess);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncGeminiAccess()})}
function scrollToNews(){if(document.body?.dataset.mode==='premium'){goToPremiumNews();return}goToNewsTop()}
function openOverlay(kind){const root=qs('#modalRoot');if(!root)return;const premium=kind==='premium';root.innerHTML=`<div class="modal workspace-overlay" role="dialog" aria-modal="true" aria-labelledby="workspace-overlay-title"><button class="close" type="button" aria-label="Close">×</button><span class="auth-premium-kicker">${premium?'PREMIUM PREVIEW':'SUPPORT'}</span><h2 id="workspace-overlay-title">${premium?'See what Premium adds.':'Need help? We’re here.'}</h2>${premium?`<p class="overlay-lead">A richer reading workspace without changing the simple Basic briefing.</p><div class="preview-feature-grid"><div><b>Deep brief</b><span>More context around each daily story.</span></div><div><b>Source context</b><span>Cleaner source details and easier reading.</span></div><div><b>Priority layout</b><span>A focused Premium workspace for deeper reading.</span></div><button class="primary" type="button" data-overlay-subscribe>Open Premium</button>`:`<p class="overlay-lead">For Premium, account, payment, news or website issues, contact us directly.</p><div class="support-contact"><b>Email support</b><a href="mailto:${EMAIL}">${EMAIL}</a><button class="secondary" type="button" data-copy-email>Copy email</button></div>`}</div>`;root.classList.remove('hidden');root.setAttribute('aria-hidden','false');const close=()=>{root.classList.add('hidden');root.setAttribute('aria-hidden','true');root.innerHTML=''};root.querySelector('.close').onclick=close;root.querySelector('[data-copy-email]')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(EMAIL);e.currentTarget.textContent='Copied';setTimeout(()=>e.currentTarget.textContent='Copy email',1400)}catch{location.href=`mailto:${EMAIL}`}});root.querySelector('[data-overlay-subscribe]')?.addEventListener('click',()=>{close();document.querySelector('[data-action="subscribe"]')?.click()})}
function bind(){document.addEventListener('click',e=>{const target=e.target instanceof Element?e.target:null;if(!target)return;const today=target.closest('.main-nav a[href="#newsGrid"]');if(today){e.preventDefault();scrollToNews();return}const support=target.closest('[data-action="open-support"]');if(support){e.preventDefault();openOverlay('support');return}const preview=target.closest('#premium-anchor .primary');if(preview){e.preventDefault();openOverlay('premium');return}});qs('#geminiForm')?.addEventListener('submit',askGemini);qs('#geminiClear')?.addEventListener('click',resetGemini);document.addEventListener('pnw:force-gemini-reset',resetGemini);window.PNW_GEMINI_RESET=resetGemini;state.geminiHistory=readGeminiHistory();renderGeminiHistory();document.addEventListener('pnw:language-changed',()=>setTimeout(initEditions,100));document.addEventListener('pnw:premium-render',syncPremiumEdition);let previousMode=document.body?.dataset.mode||'basic';const observer=new MutationObserver(()=>{const mode=document.body?.dataset.mode||'basic';if(mode!==previousMode&&mode==='premium'){renderGeminiHistory()}previousMode=mode;if(mode==='premium')syncPremiumEdition()});observer.observe(document.body,{attributes:true,attributeFilter:['data-mode']})}
function start(){installLayout();bind();const footer=qs('footer');if(footer&&!footer.querySelector('.support-email'))footer.insertAdjacentHTML('afterbegin',`<span class="support-email"><span>Support:</span> <a href="mailto:${EMAIL}">${EMAIL}</a></span>`);setTimeout(initEditions,0)}
startGeminiGate();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
