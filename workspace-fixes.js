(() => {
  'use strict';
  const EMAIL = 'muzamil.275pk@gmail.com';
  const FALLBACK_IMAGE = '/news-images/fallback.svg';
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
  const qs = s => document.querySelector(s);
  const lang = () => localStorage.getItem('pnw_language') || 'en';
  const isUrdu = () => lang() === 'ur';
  const fmtDate = d => new Date(`${d}T12:00:00`).toLocaleDateString(isUrdu() ? 'ur-PK' : 'en-PK', {dateStyle:'medium'});
  const state = { dates: [], selected: null, loading: false, posts: [] };

  function pager(){
    let el = qs('#newsPager');
    if (!el){
      el = document.createElement('nav'); el.id = 'newsPager'; el.className = 'news-pager'; el.setAttribute('aria-label','News editions');
      const section = qs('.news-section'); if(section) section.appendChild(el);
    }
    if(!state.dates.length){ el.innerHTML=''; return; }
    el.innerHTML = state.dates.slice(0,12).map((date,i) => `<button type="button" class="news-page ${date===state.selected?'active':''}" data-news-date="${esc(date)}" aria-label="News edition ${i+1}, ${esc(fmtDate(date))}" aria-current="${date===state.selected?'page':'false'}"><span>${i+1}</span><small>${esc(fmtDate(date))}</small></button>`).join('');
    el.querySelectorAll('[data-news-date]').forEach(b => b.addEventListener('click', () => loadEdition(b.dataset.newsDate)));
  }

  function card(p, premium=false){
    const ur = isUrdu(); const title = ur ? p.title_ur : p.title_en; const text = ur ? p.excerpt_ur : p.excerpt_en; const src = p.image_url || FALLBACK_IMAGE;
    const img = `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">`;
    const source = p.source_url && p.source_name ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_name)}</a>` : esc(p.source_name || '');
    return `<article class="news-card ${premium?'premium-card':''} workspace-card" data-history-title="${esc(title)}">${img}<div class="card-top"><span class="rank">0${esc(p.daily_rank)}</span><span class="category">${esc(p.category)}</span></div><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="card-meta"><time>${esc(fmtDate(p.published_on))}</time>${source ? `<span class="meta-dot">·</span><span>${source}</span>` : ''}</div>${premium?'<span class="premium-tag">Premium mode</span>':''}</article>`;
  }

  function syncPremiumEdition(){
    const mode = document.body?.dataset.mode;
    const grid = qs('#premiumGrid');
    if(mode !== 'premium' || !grid || !state.posts.length) return;
    if(!grid.querySelector('.premium-card')) return;
    grid.innerHTML = state.posts.map(p => card(p,true)).join('');
  }

  function resetGemini(){
    const messages = qs('#geminiMessages');
    const prompt = qs('#geminiPrompt');
    const status = qs('#geminiStatus');
    if(messages) messages.innerHTML = '<div class="gemini-empty">Ask for today\'s news, a summary of a story, or a comparison of the available workspace stories.</div>';
    if(prompt) prompt.value = '';
    if(status) status.textContent = '';
    if(prompt) prompt.disabled = false;
    qs('#geminiAsk')?.removeAttribute('disabled');
  }

  function appendGemini(role, text){
    const box = qs('#geminiMessages'); if(!box) return;
    const empty = box.querySelector('.gemini-empty'); if(empty) empty.remove();
    const item = document.createElement('div'); item.className = `gemini-message ${role}`;
    item.innerHTML = `<span class="gemini-role">${role === 'user' ? 'You' : 'Gemini'}</span><div class="gemini-text">${esc(text).replace(/\n/g,'<br>')}</div>`;
    box.appendChild(item); box.scrollTop = box.scrollHeight;
  }

  async function askGemini(event){
    event.preventDefault();
    const prompt = qs('#geminiPrompt'); const status = qs('#geminiStatus'); const button = qs('#geminiAsk');
    const value = prompt?.value.trim(); if(!value) return;
    if(document.body?.dataset.mode !== 'premium') return;
    button?.setAttribute('disabled','disabled'); if(prompt) prompt.disabled = true; if(status) status.textContent = 'Thinking…';
    appendGemini('user', value);
    try{
      const token = localStorage.getItem('pnw_token') || '';
      const r = await fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({prompt:value}),cache:'no-store'});
      const d = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.error || 'Gemini could not complete the request.');
      appendGemini('assistant', d.text || 'Gemini returned an empty response.');
      window.dispatchEvent(new CustomEvent('pnw:gemini-asked',{detail:{prompt:value,response:d.text||'',newsDate:d.newsDate||state.selected}}));
      if(prompt) prompt.value = '';
      if(status) status.textContent = d.newsDate ? `Based on workspace edition ${fmtDate(d.newsDate)}.` : '';
    }catch(error){
      appendGemini('assistant', error.message || 'Gemini request failed.');
      if(status) status.textContent = 'Request failed.';
    }finally{
      button?.removeAttribute('disabled'); if(prompt) prompt.disabled = false;
    }
  }

  async function loadEdition(date, announce=true){
    if(!date || state.loading) return;
    state.loading = true; state.selected = date; pager();
    const grid = qs('#newsGrid');
    if(grid){ grid.setAttribute('aria-busy','true'); grid.innerHTML='<article class="loading-card skeleton-card"><span></span><span></span><span></span></article>'; }
    try{
      const r = await fetch(`/api/news?lang=${encodeURIComponent(lang())}&date=${encodeURIComponent(date)}`, {cache:'no-store'});
      const d = await r.json(); if(!r.ok) throw new Error(d.error || 'News unavailable');
      state.dates = Array.isArray(d.availableDates) ? d.availableDates : state.dates; state.selected = d.date || date; state.posts = Array.isArray(d.posts) ? d.posts : [];
      pager();
      if(grid){ grid.innerHTML = state.posts.map(p=>card(p)).join('') || '<div class="loading-card">No stories were published for this edition.</div>'; grid.setAttribute('aria-busy','false'); }
      const dateEl = qs('#newsDate'); if(dateEl) dateEl.textContent = fmtDate(state.selected);
      localStorage.setItem('pnw_selected_news_date', state.selected);
      syncPremiumEdition();
      if(announce) window.dispatchEvent(new CustomEvent('pnw:news-edition',{detail:{date:state.selected,posts:state.posts}}));
    }catch(e){
      if(grid){ grid.setAttribute('aria-busy','false'); grid.innerHTML='<div class="loading-card error" role="alert"><div><p>Couldn’t load this edition.</p><span>Please try again.</span></div><button class="secondary" type="button" id="retryEdition">Retry</button></div>'; qs('#retryEdition')?.addEventListener('click',()=>loadEdition(date)); }
    }finally{ state.loading=false; }
  }

  async function initEditions(){
    try{
      const r = await fetch(`/api/news?lang=${encodeURIComponent(lang())}`, {cache:'no-store'}); const d = await r.json(); if(!r.ok) return;
      state.dates = Array.isArray(d.availableDates) ? d.availableDates : [];
      const saved = localStorage.getItem('pnw_selected_news_date'); const first = saved && state.dates.includes(saved) ? saved : (d.date || state.dates[0]); state.selected = first; pager();
      if(first) await loadEdition(first, false);
    }catch{}
  }

  function scrollToNews(){
    const basicButton = qs('.mode-switch [data-mode="basic"]');
    if(document.body?.dataset.mode !== 'basic') basicButton?.click();
    setTimeout(() => {
      const target = qs('#today-heading') || qs('#newsGrid');
      target?.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
  }

  function openOverlay(kind){
    const root = qs('#modalRoot'); if(!root) return; const premium = kind === 'premium';
    root.innerHTML = `<div class="modal workspace-overlay" role="dialog" aria-modal="true" aria-labelledby="workspace-overlay-title"><button class="close" type="button" aria-label="Close">×</button><span class="auth-premium-kicker">${premium?'PREMIUM PREVIEW':'SUPPORT'}</span><h2 id="workspace-overlay-title">${premium?'See what Premium adds.':'Need help? We’re here.'}</h2>${premium?`<p class="overlay-lead">A richer reading workspace without changing the simple Basic briefing.</p><div class="preview-feature-grid"><div><b>Deep brief</b><span>More context around each daily story.</span></div><div><b>Source context</b><span>Cleaner source details and easier reading.</span></div><div><b>Priority layout</b><span>A focused Premium workspace for deeper reading.</span></div></div><button class="primary" type="button" data-overlay-subscribe>Open Premium</button>`:`<p class="overlay-lead">For Premium, account, payment, news or website issues, contact us directly.</p><div class="support-contact"><b>Email support</b><a href="mailto:${EMAIL}">${EMAIL}</a><button class="secondary" type="button" data-copy-email>Copy email</button></div>`}</div>`;
    root.classList.remove('hidden'); root.setAttribute('aria-hidden','false');
    const close = () => {root.classList.add('hidden');root.setAttribute('aria-hidden','true');root.innerHTML=''};
    root.querySelector('.close').onclick=close;
    root.querySelector('[data-copy-email]')?.addEventListener('click', async e=>{try{await navigator.clipboard.writeText(EMAIL);e.currentTarget.textContent='Copied';setTimeout(()=>e.currentTarget.textContent='Copy email',1400)}catch{location.href=`mailto:${EMAIL}`}});
    root.querySelector('[data-overlay-subscribe]')?.addEventListener('click',()=>{close();document.querySelector('[data-action="subscribe"]')?.click()});
  }

  function bind(){
    document.addEventListener('click', e=>{
      const today = e.target.closest('.main-nav a[href="#newsGrid"]');
      if(today){e.preventDefault();scrollToNews();return;}
      const support=e.target.closest('[data-action="open-support"]'); if(support){e.preventDefault();openOverlay('support');return;}
      const preview=e.target.closest('#premium-anchor .primary'); if(preview){e.preventDefault();openOverlay('premium');return;}
    });
    qs('#geminiForm')?.addEventListener('submit', askGemini);
    qs('#geminiClear')?.addEventListener('click', resetGemini);
    document.addEventListener('pnw:language-changed', ()=>setTimeout(initEditions,100));
    document.addEventListener('pnw:premium-render', syncPremiumEdition);
    let previousMode = document.body?.dataset.mode || 'basic';
    const observer = new MutationObserver(() => {
      const mode = document.body?.dataset.mode || 'basic';
      if(mode !== previousMode && mode === 'premium') resetGemini();
      previousMode = mode;
      if(mode === 'premium') syncPremiumEdition();
    });
    observer.observe(document.body,{attributes:true,attributeFilter:['data-mode']});
  }

  function start(){
    bind();
    const footer=qs('footer');
    if(footer && !footer.querySelector('.support-email')) footer.insertAdjacentHTML('afterbegin', `<span class="support-email"><span>Support:</span> <a href="mailto:${EMAIL}">${EMAIL}</a></span>`);
    setTimeout(initEditions,900);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
