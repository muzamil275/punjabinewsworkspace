(() => {
'use strict';

const qs = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
const editionCache = new Map();
let editionLoadSeq = 0;

function installPremiumFixes() {
  if (qs('#pnw-premium-mobile-fixes')) return;
  const style = document.createElement('style');
  style.id = 'pnw-premium-mobile-fixes';
  style.textContent = `
    #premiumMode .premium-news-pager{position:relative;z-index:4;width:100%;max-width:100%;}
    #premiumMode .premium-news-pager .news-page{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:52px;min-height:42px;white-space:normal;}
    #premiumMode .premium-news-pager .news-page span{display:block;line-height:1;font-weight:900;}
    #premiumMode .premium-news-pager .news-page small{display:block;line-height:1.05;font-size:.62rem;white-space:nowrap;}
    body[data-mode="premium"] .premium-mode .premium-card h3,
    body[data-mode="premium"] .premium-mode .premium-card p,
    body[data-mode="premium"] .premium-mode .premium-card .card-meta,
    body[data-mode="premium"] .premium-mode .premium-card .premium-tag,
    body[data-mode="premium"] .premium-mode .primary,
    body[data-mode="premium"] .premium-mode .secondary,
    body[data-mode="premium"] .premium-mode .gemini-head h3,
    body[data-mode="premium"] .premium-mode .gemini-head .muted,
    body[data-mode="premium"] .premium-mode .gemini-form textarea,
    body[data-mode="premium"] .premium-mode .gemini-actions{max-width:100%;min-width:0;overflow-wrap:anywhere;word-break:normal;}
    body[data-mode="premium"] .premium-mode .premium-grid{width:100%;max-width:100%;margin-left:auto;margin-right:auto;}
    body[data-mode="premium"] .premium-mode .premium-card{min-width:0;max-width:100%;}
    body[data-mode="premium"] .premium-mode .premium-card h3{overflow-wrap:anywhere;}
    body[data-mode="premium"] .premium-mode .premium-card p{overflow-wrap:anywhere;}
    body[data-mode="premium"] .premium-mode .premium-card .card-meta{overflow-wrap:anywhere;}
    body[data-mode="premium"] .premium-mode .premium-card img{max-width:100%;object-position:center center;display:block;}
    body[data-mode="premium"] .premium-mode .premium-toolbar{justify-content:center;align-items:center;}
    body[data-mode="premium"] .premium-mode{overflow:visible!important;overflow-x:clip!important;touch-action:pan-y;overscroll-behavior-x:none;-webkit-overflow-scrolling:touch;}
    @media (max-width:700px){
      body[data-mode="premium"] .premium-mode{margin-left:-20px;margin-right:-20px;padding:40px 10px 70px;min-height:calc(100dvh - 64px);}
      body[data-mode="premium"] .premium-mode .premium-hero{align-items:flex-start;flex-direction:column;gap:18px;padding-bottom:24px;}
      body[data-mode="premium"] .premium-mode .premium-hero h2{max-width:100%;overflow-wrap:anywhere;}
      body[data-mode="premium"] .premium-mode .premium-hero .muted{max-width:100%;}
      body[data-mode="premium"] .premium-mode .premium-toolbar{margin:18px auto 16px;gap:7px;width:100%;justify-content:center;}
      body[data-mode="premium"] .premium-mode .premium-grid{grid-template-columns:minmax(0,1fr);gap:12px;width:100%;max-width:680px;margin-left:auto;margin-right:auto;justify-items:stretch;}
      body[data-mode="premium"] .premium-mode .premium-card{grid-column:1 / -1;min-height:0;width:100%;padding:18px;border-radius:12px;overflow:hidden;}
      body[data-mode="premium"] .premium-mode .premium-card .news-image-wrap{width:100%;max-width:100%;margin:0 0 16px;overflow:hidden;}
      body[data-mode="premium"] .premium-mode .premium-card img{display:block;width:100%!important;max-width:100%!important;height:auto!important;aspect-ratio:16/9;object-fit:cover!important;object-position:center center!important;margin:0!important;}
      body[data-mode="premium"] .premium-mode .premium-card h3{font-size:1.3rem;line-height:1.15;margin:14px 0 9px;overflow-wrap:anywhere;}
      body[data-mode="premium"] .premium-mode .premium-card p{font-size:1rem;line-height:1.5;overflow-wrap:anywhere;}
      body[data-mode="premium"] .premium-mode .premium-news-pager{margin:22px auto 4px;gap:6px;justify-content:center;}
      body[data-mode="premium"] .premium-mode .premium-news-pager .news-page{min-width:50px;min-height:40px;padding:5px 7px;}
      body[data-mode="premium"] .premium-mode .gemini-workspace{margin-left:0;margin-right:0;max-width:100%;min-width:0;}
    }
    @supports not (height:100dvh){@media (max-width:700px){body[data-mode="premium"] .premium-mode{min-height:calc(100vh - 64px);}}}
    @media (prefers-reduced-motion:reduce){#premiumMode .premium-news-pager .news-page{transition:none;}}
  `;
  document.head.appendChild(style);
}

function formatDate(date, lang) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-PK', { dateStyle:'medium' });
}

function renderPremiumCards(posts, lang) {
  const grid = qs('#premiumGrid');
  if (!grid) return;
  const cards = Array.isArray(posts) ? posts : [];
  if (!cards.length) {
    grid.innerHTML = '<div class="premium-gate"><span class="premium-gate-kicker">Edition unavailable</span><h3>No stories for this edition.</h3><p>Please choose another date from the editions below.</p></div>';
    return;
  }
  grid.innerHTML = cards.map((p, index) => {
    const title = lang === 'ur' ? p.title_ur : p.title_en;
    const text = lang === 'ur' ? p.excerpt_ur : p.excerpt_en;
    const source = p.source_url && p.source_name
      ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_name)}</a>`
      : (p.source_name ? esc(p.source_name) : '');
    const loading = index < 2 ? 'eager' : 'lazy';
    const priority = index < 2 ? ' fetchpriority="high"' : '';
    const image = p.image_url ? `<img src="${esc(p.image_url)}" alt="" loading="${loading}" decoding="async"${priority}>` : '';
    return `<article class="news-card premium-card">${image}<div class="card-top"><span class="rank">0${esc(p.daily_rank)}</span><span class="category">${esc(p.category)}</span></div><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="card-meta"><time>${formatDate(p.published_on || p.updated_at, lang)}</time>${source ? `<span class="meta-dot">·</span><span>${source}</span>` : ''}</div><span class="premium-tag">Premium mode</span></article>`;
  }).join('');
}

function showEditionLoading(grid) {
  grid.innerHTML = '<div class="premium-gate edition-loading" aria-live="polite"><span class="premium-gate-kicker">Loading edition</span><h3>Switching news date…</h3><p>The selected edition is loading.</p></div>';
}

async function loadPremiumEdition(date) {
  const lang = document.documentElement.lang === 'ur' ? 'ur' : 'en';
  const grid = qs('#premiumGrid');
  const premium = qs('#premiumMode');
  if (!grid) return;
  const requestId = ++editionLoadSeq;
  const scrollY = window.scrollY;
  grid.setAttribute('aria-busy','true');

  const cached = editionCache.get(`${lang}:${date}`);
  if (cached) {
    renderPremiumCards(cached.posts || [], lang);
    const newsDate = qs('#newsDate');
    if (newsDate) newsDate.textContent = formatDate(cached.date || date, lang);
    syncPremiumPager(cached.availableDates?.length ? cached.availableDates : [], cached.date || date);
    window.scrollTo({ top: scrollY, behavior:'auto' });
  } else {
    showEditionLoading(grid);
  }

  try {
    const r = await fetch(`/api/news?lang=${encodeURIComponent(lang)}&date=${encodeURIComponent(date)}&includeDates=0`, { cache:'no-store' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'News request failed.');
    editionCache.set(`${lang}:${date}`, data);
    if (requestId !== editionLoadSeq) return;
    renderPremiumCards(data.posts || [], lang);
    const newsDate = qs('#newsDate');
    if (newsDate) newsDate.textContent = formatDate(data.date || date, lang);
    const currentPager = qs('#premiumNewsPager');
    const existingDates = currentPager ? [...currentPager.querySelectorAll('[data-premium-date]')].map(b => b.dataset.premiumDate) : [];
    syncPremiumPager(existingDates, data.date || date);
    window.scrollTo({ top: scrollY, behavior:'auto' });
  } catch {
    if (requestId === editionLoadSeq) {
      grid.innerHTML = '<div class="premium-gate"><span class="premium-gate-kicker">Edition unavailable</span><h3>Could not load this edition.</h3><p>Please try another date.</p></div>';
      window.scrollTo({ top: scrollY, behavior:'auto' });
    }
  } finally {
    if (requestId === editionLoadSeq) grid.setAttribute('aria-busy','false');
  }
}

function syncPremiumPager(availableDates, activeDate) {
  const premium = qs('#premiumMode');
  const grid = qs('#premiumGrid');
  if (!premium || !grid) return;
  let pager = qs('#premiumNewsPager');
  if (!pager) {
    pager = document.createElement('nav');
    pager.id = 'premiumNewsPager';
    pager.className = 'news-pager premium-news-pager';
    pager.setAttribute('aria-label', 'News editions');
    grid.parentNode.appendChild(pager);
  } else if (pager.parentNode !== grid.parentNode || pager.previousElementSibling !== grid) {
    grid.parentNode.appendChild(pager);
  }
  const dates = [...new Set((Array.isArray(availableDates) ? availableDates : []).filter(Boolean))].slice(0, 12);
  if (!dates.length) { pager.innerHTML = ''; return; }
  const lang = document.documentElement.lang === 'ur' ? 'ur' : 'en';
  pager.innerHTML = dates.map((date, i) => `<button type="button" class="news-page${date === activeDate ? ' active' : ''}" data-premium-date="${esc(date)}" aria-label="News edition ${i + 1}, ${esc(formatDate(date, lang))}" aria-current="${date === activeDate ? 'page' : 'false'}"><span>${i + 1}</span><small>${esc(formatDate(date, lang))}</small></button>`).join('');
  pager.querySelectorAll('[data-premium-date]').forEach(btn => btn.addEventListener('click', () => loadPremiumEdition(btn.dataset.premiumDate)));
}

async function initialPremiumPager() {
  try {
    const lang = document.documentElement.lang === 'ur' ? 'ur' : 'en';
    const r = await fetch(`/api/news?lang=${encodeURIComponent(lang)}&includeDates=1`, { cache:'no-store' });
    const data = await r.json();
    if (!r.ok) return;
    editionCache.set(`${lang}:${data.date}`, data);
    syncPremiumPager(data.availableDates || [], data.date);
  } catch {}
}

function loadManagementAndOpen() {
  if (typeof window.PNW_PREMIUM_MANAGE === 'function') return window.PNW_PREMIUM_MANAGE();
  const existing = document.querySelector('script[data-pnw-premium-management]');
  if (existing) return;
  const script = document.createElement('script');
  script.src = '/premium-management.js?v=20260921a';
  script.dataset.pnwPremiumManagement = 'true';
  script.onload = () => window.PNW_PREMIUM_MANAGE?.();
  script.onerror = () => {
    const toast = qs('#toast');
    if (toast) { toast.textContent='Premium management could not be loaded. Please try again.'; toast.className='toast error'; toast.classList.remove('hidden'); }
  };
  document.head.appendChild(script);
}

function installPremiumInteractionGuard() {
  if (window.__pnwPremiumInteractionGuard) return;
  window.__pnwPremiumInteractionGuard = true;
  document.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    const manage = target.closest('#premiumMode .premium-hero [data-action="subscribe"]');
    if (manage) {
      e.preventDefault();
      e.stopImmediatePropagation();
      loadManagementAndOpen();
      return;
    }
    const clear = target.closest('#geminiClear');
    if (clear) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (typeof window.PNW_GEMINI_RESET === 'function') window.PNW_GEMINI_RESET();
      else document.dispatchEvent(new Event('pnw:force-gemini-reset'));
    }
  }, true);
}

function start() {
  installPremiumFixes();
  installPremiumInteractionGuard();
  initialPremiumPager();
  const observerTarget = qs('#premiumMode');
  if (observerTarget) {
    const observer = new MutationObserver(() => {
      if (!qs('#premiumNewsPager')) initialPremiumPager();
    });
    observer.observe(observerTarget, { childList:true });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
else start();
})();