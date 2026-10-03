(() => {
  'use strict';

  const q = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
  const lang = () => document.documentElement.lang === 'ur' ? 'ur' : 'en';
  const formatDate = d => new Date(`${d}T12:00:00`).toLocaleDateString(lang() === 'ur' ? 'ur-PK' : 'en-PK', { dateStyle: 'medium' });
  const validCalendarDate = value => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!m) return false;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
  };

  function styles() {
    if (q('#dateSearchStyles')) return;
    const s = document.createElement('style');
    s.id = 'dateSearchStyles';
    s.textContent = `.date-search-controls{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;width:100%;margin:0 0 18px}.date-search-controls .date-search-custom,.date-search-controls .date-search-available{display:flex;align-items:flex-end;gap:8px}.date-search-controls label{display:flex;flex-direction:column;gap:5px;font-size:.72rem;font-weight:800;opacity:.75}.date-search-controls input,.date-search-controls select{height:42px;border:1px solid rgba(127,120,109,.22);border-radius:12px;padding:0 11px;background:transparent;color:inherit;font:inherit;min-width:150px}.date-search-controls button{height:42px;white-space:nowrap}.main-nav .text-button{transform:translateY(-2px)}#newsGrid .news-card{user-select:text;-webkit-user-select:text}@media(max-width:600px){.date-search-controls{align-items:stretch}.date-search-controls .date-search-custom,.date-search-controls .date-search-available{width:100%;align-items:stretch}.date-search-controls label{flex:1;min-width:140px}.date-search-controls input,.date-search-controls select{width:100%;min-width:0}.date-search-controls button{width:100%}}`;
    document.head.appendChild(s);
  }

  let editionRequestSeq = 0;

  async function fetchEdition(date) {
    const grid = q('#newsGrid');
    const requestLang = lang();
    const requestSeq = ++editionRequestSeq;
    if (!grid || !validCalendarDate(date)) return;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '<article class="loading-card skeleton-card"><span></span><span></span><span></span></article>';
    try {
      const r = await fetch(`/api/news?lang=${encodeURIComponent(requestLang)}&date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'News request failed.');
      if (requestSeq !== editionRequestSeq || requestLang !== lang()) return;
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
          const title = requestLang === 'ur' ? p.title_ur : p.title_en;
          const text = requestLang === 'ur' ? p.excerpt_ur : p.excerpt_en;
          const source = p.source_url && p.source_name ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_name)}</a>` : esc(p.source_name || '');
          const image = p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '';
          return `<article class="news-card"><div class="news-image-wrap">${image}</div><div class="card-top"><span class="rank">0${esc(p.daily_rank)}</span><span class="category">${esc(p.category)}</span></div><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="card-meta"><time>${esc(formatDate(p.published_on))}</time>${source ? `<span class="meta-dot">·</span><span>${source}</span>` : ''}</div></article>`;
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

  function pakistanToday() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  const MIN_EDITION_DATE = '2026-09-04';

  function makeControls(id, premium = false) {
    if (q(id)) return;
    const target = premium ? q('#premiumGrid') : q('#newsGrid');
    if (!target) return;
    const wrap = document.createElement('div');
    wrap.id = id.slice(1);
    wrap.className = 'date-search-controls';
    const dateLabel = lang() === 'ur' ? 'حسبِ منشا تاریخ' : 'Custom date';
    const editionsLabel = lang() === 'ur' ? 'دستیاب ایڈیشنز' : 'Available editions';
    const selectPrompt = lang() === 'ur' ? 'ایڈیشن منتخب کریں' : 'Select an edition';
    const searchLabel = lang() === 'ur' ? 'تلاش' : 'Search';
    wrap.innerHTML =
      `<div class="date-search-custom"><label>${dateLabel}<input type="date" min="${MIN_EDITION_DATE}" max="${pakistanToday()}" aria-label="${dateLabel}"></label><button class="secondary" type="button" data-date-custom-search>${searchLabel}</button></div>` +
      `<div class="date-search-available"><label>${editionsLabel}<select aria-label="${editionsLabel}"><option value="">${selectPrompt}</option></select></label><button class="secondary" type="button" data-date-available-search>${searchLabel}</button></div>`;
    target.parentNode.insertBefore(wrap, target);
    const input = wrap.querySelector('input'), select = wrap.querySelector('select');
    const customButton = wrap.querySelector('[data-date-custom-search]');
    const availableButton = wrap.querySelector('[data-date-available-search]');
    const minDate = MIN_EDITION_DATE;
    const maxDate = pakistanToday();

    getDates().then(dates => {
      const usableDates = dates.filter(d => validCalendarDate(d) && d >= minDate && d <= maxDate);
      select.innerHTML = `<option value="">${selectPrompt}</option>${usableDates.map(d => `<option value="${esc(d)}">${esc(formatDate(d))}</option>`).join('')}`;
    });

    const searchDate = date => {
      if (!date) return;
      if (!validCalendarDate(date) || date < minDate || date > maxDate) {
        input.setCustomValidity(lang() === 'ur'
          ? 'صرف 4 ستمبر 2026 سے آج تک کی تاریخ منتخب کریں۔'
          : 'Please select a date from 4 September 2026 through today.');
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      if (premium) window.dispatchEvent(new CustomEvent('pnw:premium-date-search', { detail: { date } }));
      else fetchEdition(date);
    };

    customButton.addEventListener('click', () => searchDate(input.value));
    availableButton.addEventListener('click', () => {
      const date = select.value;
      if (!date) return;
      searchDate(date);
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
