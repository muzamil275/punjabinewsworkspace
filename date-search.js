(() => {
  'use strict';

  const q = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
  const lang = () => document.documentElement.lang === 'ur' ? 'ur' : 'en';
  const formatDate = d => new Date(`${d}T12:00:00`).toLocaleDateString(lang() === 'ur' ? 'ur-PK' : 'en-PK', { dateStyle: 'medium' });

  function styles() {
    if (q('#dateSearchStyles')) return;
    const s = document.createElement('style');
    s.id = 'dateSearchStyles';
    s.textContent = `.date-search-controls{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;width:100%;margin:0 0 18px}.date-search-controls label{display:flex;flex-direction:column;gap:5px;font-size:.72rem;font-weight:800;opacity:.75}.date-search-controls input,.date-search-controls select{height:42px;border:1px solid rgba(127,120,109,.22);border-radius:12px;padding:0 11px;background:transparent;color:inherit;font:inherit;min-width:150px}.date-search-controls button{height:42px;white-space:nowrap}.main-nav .text-button{transform:translateY(-2px)}#newsGrid .news-card{user-select:text;-webkit-user-select:text}@media(max-width:600px){.date-search-controls{align-items:stretch}.date-search-controls label{flex:1;min-width:140px}.date-search-controls input,.date-search-controls select{width:100%;min-width:0}.date-search-controls button{width:100%}}`;
    document.head.appendChild(s);
  }

  async function fetchEdition(date) {
    const grid = q('#newsGrid');
    if (!grid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '<article class="loading-card skeleton-card"><span></span><span></span><span></span></article>';
    try {
      const r = await fetch(`/api/news?lang=${encodeURIComponent(lang())}&date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'News request failed.');
      const posts = Array.isArray(d.posts) ? d.posts : [];
      const actualDate = d.date || date;
      const dateEl = q('#newsDate');
      if (dateEl) dateEl.textContent = actualDate ? formatDate(actualDate) : formatDate(date);
      if (!posts.length && !d.isLatestAvailable) {
        grid.innerHTML = '<div class="loading-card" role="status"><p>Edition unavailable — pick another date.</p></div>';
      } else if (!posts.length) {
        grid.innerHTML = '<div class="loading-card">No stories were published for this date.</div>';
      } else {
        grid.innerHTML = posts.map(p => {
          const title = lang() === 'ur' ? p.title_ur : p.title_en;
          const text = lang() === 'ur' ? p.excerpt_ur : p.excerpt_en;
          const source = p.source_url && p.source_name ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_name)}</a>` : esc(p.source_name || '');
          const image = p.image_url ? `<div class="news-image-wrap"><img src="${esc(p.image_url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>` : '';
          return `<article class="news-card"><div class="news-image-wrap">${image ? image.replace('<div class="news-image-wrap">','').replace('</div>','') : ''}</div><div class="card-top"><span class="rank">0${esc(p.daily_rank)}</span><span class="category">${esc(p.category)}</span></div><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="card-meta"><time>${esc(formatDate(p.published_on))}</time>${source ? `<span class="meta-dot">·</span><span>${source}</span>` : ''}</div></article>`;
        }).join('');
      }
      localStorage.setItem('pnw_selected_news_date', actualDate);
      window.dispatchEvent(new CustomEvent('pnw:news-edition',{detail:{date:actualDate,posts}}));
    } catch {
      grid.innerHTML = '<div class="loading-card error" role="alert"><div><p>Couldn’t load this edition.</p><span>Please try again.</span></div></div>';
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }

  function protectSelectedEdition() {
    const grid = q('#newsGrid');
    if (!grid || grid.__pnwEditionGuard) return;
    grid.__pnwEditionGuard = true;
    let lastGoodHTML = '';
    let lastGoodDate = '';
    let restoring = false;
    const capture = () => {
      const cards = grid.querySelectorAll('.news-card');
      if (cards.length) {
        lastGoodHTML = grid.innerHTML;
        lastGoodDate = localStorage.getItem('pnw_selected_news_date') || '';
      }
    };
    capture();
    const observer = new MutationObserver(() => {
      if (restoring) return;
      capture();
      if (!lastGoodHTML || !lastGoodDate) return;
      if (grid.querySelector('.news-card')) return;
      const selected = localStorage.getItem('pnw_selected_news_date') || '';
      if (!selected || selected !== lastGoodDate) return;
      const text = (grid.textContent || '').trim().toLowerCase();
      if (!text.includes('no stories') && !text.includes('today')) return;
      restoring = true;
      queueMicrotask(() => {
        if (localStorage.getItem('pnw_selected_news_date') === lastGoodDate && !grid.querySelector('.news-card')) grid.innerHTML = lastGoodHTML;
        restoring = false;
      });
    });
    observer.observe(grid,{childList:true,subtree:true});
  }

  function setupGuardWhenReady() {
    const run = () => protectSelectedEdition();
    if (q('#newsGrid')) run();
    else setTimeout(run, 500);
  }

  async function getDates() {
    try {
      const r = await fetch(`/api/news?lang=${encodeURIComponent(lang())}&includeDates=1`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return [];
      return Array.isArray(d.availableDates) ? d.availableDates : [];
    } catch { return []; }
  }

  function makeControls(id, premium = false) {
    if (q(id)) return;
    const target = premium ? q('#premiumGrid') : q('#newsGrid');
    if (!target) return;
    const wrap = document.createElement('div');
    wrap.id = id.slice(1);
    wrap.className = 'date-search-controls';
    wrap.innerHTML = `<label>${lang() === 'ur' ? 'تاریخ' : 'Date'}<input type="date"></label><label>${lang() === 'ur' ? 'محفوظ شدہ ایڈیشن' : 'Available editions'}<select><option value="">${lang() === 'ur' ? 'تاریخ منتخب کریں' : 'Select a date'}</option></select></label><button class="secondary" type="button">${lang() === 'ur' ? 'تلاش' : 'Search'}</button>`;
    target.parentNode.insertBefore(wrap, target);
    const input = wrap.querySelector('input'), select = wrap.querySelector('select'), button = wrap.querySelector('button');
    getDates().then(dates => {
      select.innerHTML = `<option value="">${lang() === 'ur' ? 'تاریخ منتخب کریں' : 'Select a date'}</option>${dates.map(d => `<option value="${esc(d)}">${esc(formatDate(d))}</option>`).join('')}`;
    });
    input.addEventListener('change', () => { select.value = input.value; });
    select.addEventListener('change', () => { input.value = select.value; });
    button.addEventListener('click', () => {
      const date = input.value || select.value;
      if (!date) return;
      if (premium) window.dispatchEvent(new CustomEvent('pnw:premium-date-search', { detail: { date } }));
      else fetchEdition(date);
    });
  }

  function setup() {
    styles();
    setupGuardWhenReady();
    makeControls('#pnwDateSearch', false);
    makeControls('#pnwPremiumDateSearch', true);
  }

  function init() {
    const run = () => setTimeout(setup, 250);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }
  init();
})();
