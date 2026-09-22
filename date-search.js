(() => {
  'use strict';
  const q = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
  const lang = () => document.documentElement.lang === 'ur' ? 'ur' : 'en';
  const formatDate = d => new Date(`${d}T12:00:00`).toLocaleDateString(lang() === 'ur' ? 'ur-PK' : 'en-PK', { dateStyle: 'medium' });
  const available = async () => {
    const r = await fetch(`/api/news?lang=${lang()}&includeDates=1`, { cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Could not load news dates.');
    return d;
  };
  const card = p => {
    const ur = lang() === 'ur';
    const title = ur ? p.title_ur : p.title_en;
    const text = ur ? p.excerpt_ur : p.excerpt_en;
    const source = p.source_url && p.source_name ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_name)}</a>` : (p.source_name ? esc(p.source_name) : '');
    const image = p.image_url ? `<img src="${esc(p.image_url)}" alt="" loading="lazy" decoding="async">` : '';
    return `<article class="news-card">${image}<div class="card-top"><span class="rank">0${esc(p.daily_rank)}</span><span class="category">${esc(p.category)}</span></div><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="card-meta"><time>${formatDate(p.published_on || p.updated_at)}</time>${source ? `<span class="meta-dot">·</span><span>${source}</span>` : ''}</div></article>`;
  };
  function styles() {
    if (q('#dateSearchStyles')) return;
    const s = document.createElement('style'); s.id = 'dateSearchStyles';
    s.textContent = `.date-search-controls{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;width:100%;}.date-search-controls label{display:flex;flex-direction:column;gap:5px;font-size:.72rem;font-weight:800;opacity:.75;}.date-search-controls input,.date-search-controls select{height:42px;border:1px solid rgba(127,120,109,.22);border-radius:12px;padding:0 11px;background:transparent;color:inherit;font:inherit;min-width:150px;}.date-search-controls button{height:42px;white-space:nowrap;}#premiumDatePager{margin:0 0 18px;}#premiumDatePager .date-search-controls{justify-content:flex-start;}#premiumNewsPager{display:none!important;}@media(max-width:600px){.date-search-controls{align-items:stretch;}.date-search-controls label{flex:1;min-width:140px;}.date-search-controls input,.date-search-controls select{width:100%;min-width:0;}.date-search-controls button{width:100%;}.date-search-controls label:last-of-type{flex-basis:100%;}}`;
    document.head.appendChild(s);
  }
  function controls(id, dates, active, onSearch) {
    const old = q(`#${id}`); if (!old) return;
    const wrap = document.createElement('div'); wrap.id = `${id}Controls`; wrap.className = 'date-search-controls';
    wrap.innerHTML = `<label>${lang()==='ur'?'تاریخ':'Date'}<input id="${id}Input" type="date" value="${esc(active || '')}"></label><label>${lang()==='ur'?'محفوظ شدہ ایڈیشن':'Available editions'}<select id="${id}Select"><option value="">${lang()==='ur'?'تاریخ منتخب کریں':'Select a date'}</option>${dates.map(d=>`<option value="${esc(d)}"${d===active?' selected':''}>${esc(formatDate(d))}</option>`).join('')}</select></label><button id="${id}Search" class="secondary" type="button">${lang()==='ur'?'تلاش':'Search'}</button>`;
    old.replaceWith(wrap);
    const input = q(`#${id}Input`), select = q(`#${id}Select`);
    input.onchange = () => { select.value = input.value; };
    select.onchange = () => { input.value = select.value; };
    q(`#${id}Search`).onclick = () => onSearch(input.value || select.value);
  }
  async function loadBasic(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    localStorage.setItem('pnw_selected_news_date', date);
    const grid = q('#newsGrid'); grid.setAttribute('aria-busy','true');
    try {
      const r = await fetch(`/api/news?lang=${lang()}&date=${encodeURIComponent(date)}&includeDates=1`, { cache:'no-store' });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'News request failed.');
      q('#newsDate').textContent = formatDate(d.date || date);
      grid.innerHTML = d.posts?.length ? d.posts.map(card).join('') : '<div class="loading-card">No stories were published for this date.</div>';
      grid.setAttribute('aria-busy','false');
      const pager = q('#newsPager'); if (pager && !q('#newsDateControls')) controls('newsDate', d.availableDates || [], d.date || date, loadBasic);
    } catch { grid.setAttribute('aria-busy','false'); grid.innerHTML = '<div class="loading-card error"><div><p>Could not load this date.</p><span>Please choose another date and try again.</span></div></div>'; }
  }
  async function setupBasic() {
    const pager = q('#newsPager'); if (!pager) return;
    try { const d = await available(); const active = localStorage.getItem('pnw_selected_news_date') || d.date; controls('newsDate', d.availableDates || [], active, loadBasic); if (active !== d.date) loadBasic(active); }
    catch {}
  }
  function setupPremium() {
    const premium = q('#premiumMode'); if (!premium || q('#premiumDatePager')) return;
    const observer = new MutationObserver(() => {
      const old = q('#premiumNewsPager');
      if (!old || q('#premiumDatePager')) return;
      const dates = [...old.querySelectorAll('[data-premium-date]')].map(b => b.dataset.premiumDate);
      const active = old.querySelector('.active')?.dataset.premiumDate || dates[0] || '';
      const wrap = document.createElement('nav'); wrap.id='premiumDatePager'; wrap.setAttribute('aria-label','Search news by date');
      premium.querySelector('.premium-toolbar')?.after(wrap) || premium.prepend(wrap);
      controls('premiumDatePager', dates, active, date => {
        const button = old.querySelector(`[data-premium-date="${CSS.escape(date)}"]`);
        if (button) button.click();
      });
    });
    observer.observe(premium, { childList:true, subtree:true });
  }
  function init(){styles();setupBasic();setupPremium();q('#languageToggle')?.addEventListener('click',()=>setTimeout(()=>{location.reload()},120));}
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, {once:true}) : init();
})();
