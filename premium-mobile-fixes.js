(() => {
'use strict';

function qs(s) { return document.querySelector(s); }

function installPremiumFixes() {
  if (qs('#pnw-premium-mobile-fixes')) return;
  const style = document.createElement('style');
  style.id = 'pnw-premium-mobile-fixes';
  style.textContent = `
    /* Preserve the original Premium visual system: colors, gradients, shadows and motion stay enabled. */
    #premiumMode .premium-news-pager{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;margin:28px auto 8px;position:relative;z-index:4;padding:4px 0;max-width:100%;}
    #premiumMode .premium-news-pager .news-page{min-width:36px;min-height:36px;padding:7px 9px;border:1px solid var(--premium-line);border-radius:9px;background:var(--premium-surface);color:var(--premium-muted);font:800 .76rem/1.1 inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .18s,border-color .18s,color .18s,background .18s;}
    #premiumMode .premium-news-pager .news-page:hover,#premiumMode .premium-news-pager .news-page:focus-visible{transform:translateY(-2px);border-color:#40556d;color:var(--premium-text);background:var(--premium-surface-2);outline:none;}
    #premiumMode .premium-news-pager .news-page.active{border-color:var(--premium-mango);color:#111;background:var(--premium-mango);}
    #premiumMode .premium-news-pager .news-page small{display:none;}
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
    body[data-mode="premium"] .premium-mode .premium-card img{max-width:100%;object-position:center center;}
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
      body[data-mode="premium"] .premium-mode .premium-card img{display:block;width:calc(100% + 36px);max-width:none;height:auto;aspect-ratio:16/9;margin:-18px -18px 16px;object-fit:cover;object-position:center center;}
      body[data-mode="premium"] .premium-mode .premium-card h3{font-size:1.3rem;line-height:1.15;margin:14px 0 9px;overflow-wrap:anywhere;}
      body[data-mode="premium"] .premium-mode .premium-card p{font-size:1rem;line-height:1.5;overflow-wrap:anywhere;}
      body[data-mode="premium"] .premium-mode .premium-news-pager{margin:22px auto 4px;gap:6px;justify-content:center;}
      body[data-mode="premium"] .premium-mode .premium-news-pager .news-page{min-width:34px;min-height:34px;padding:6px 8px;}
      body[data-mode="premium"] .premium-mode .gemini-workspace{margin-left:0;margin-right:0;max-width:100%;min-width:0;}
    }
    @supports not (height:100dvh){@media (max-width:700px){body[data-mode="premium"] .premium-mode{min-height:calc(100vh - 64px);}}}
    @media (prefers-reduced-motion:reduce){#premiumMode .premium-news-pager .news-page{transition:none;}}
  `;
  document.head.appendChild(style);
}

function syncPremiumPager() {
  const premium = qs('#premiumMode');
  const basic = qs('#newsPager');
  if (!premium || !basic) return;
  let pager = qs('#premiumNewsPager');
  if (!pager) {
    pager = document.createElement('nav');
    pager.id = 'premiumNewsPager';
    pager.className = 'premium-news-pager';
    pager.setAttribute('aria-label', 'Premium news editions');
    const grid = qs('#premiumGrid');
    if (grid?.parentNode) grid.parentNode.insertBefore(pager, qs('#geminiWorkspace'));
  }
  const next = basic.innerHTML;
  if (pager.innerHTML === next) return;
  pager.innerHTML = next;
  pager.querySelectorAll('[data-news-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const original = basic.querySelector(`[data-news-date="${btn.dataset.newsDate}"]`);
      original?.click();
    });
  });
}

function start() {
  installPremiumFixes();
  syncPremiumPager();
  const basic = qs('#newsPager');
  if (basic) {
    const observer = new MutationObserver(() => syncPremiumPager());
    observer.observe(basic, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
})();
