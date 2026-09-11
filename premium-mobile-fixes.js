(() => {
'use strict';

function qs(s) { return document.querySelector(s); }

function installPremiumFixes() {
  if (qs('#pnw-premium-mobile-fixes')) return;
  const style = document.createElement('style');
  style.id = 'pnw-premium-mobile-fixes';
  style.textContent = `
    /* Premium pagination: keep the same edition controls available at the bottom of Premium. */
    #premiumMode .premium-news-pager{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:7px;margin:28px 0 8px;position:relative;z-index:4;padding:4px 0;}
    #premiumMode .premium-news-pager .news-page{min-width:36px;min-height:36px;padding:7px 9px;border:1px solid var(--premium-line);border-radius:9px;background:var(--premium-surface);color:var(--premium-muted);font:800 .76rem/1.1 inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .18s,border-color .18s,color .18s,background .18s;}
    #premiumMode .premium-news-pager .news-page:hover,#premiumMode .premium-news-pager .news-page:focus-visible{transform:translateY(-2px);border-color:#40556d;color:var(--premium-text);background:var(--premium-surface-2);outline:none;}
    #premiumMode .premium-news-pager .news-page.active{border-color:var(--premium-mango);color:#111;background:var(--premium-mango);}
    #premiumMode .premium-news-pager .news-page small{display:none;}

    /* Premium typography: reduce text above 10px by 2px; keep tiny labels unchanged. */
    body[data-mode="premium"] .premium-mode .premium-hero h2{font-size:clamp(calc(3rem - 2px),calc(6vw - 2px),calc(6.3rem - 2px));}
    body[data-mode="premium"] .premium-mode .premium-hero .muted{font-size:calc(1.02rem - 2px);}
    body[data-mode="premium"] .premium-mode .premium-card h3{font-size:calc(1.35rem - 2px);line-height:1.08;}
    body[data-mode="premium"] .premium-mode .premium-card p{font-size:calc(1rem - 2px);line-height:1.5;}
    body[data-mode="premium"] .premium-mode .premium-card .rank{font-size:calc(1.25rem - 2px);}
    body[data-mode="premium"] .premium-mode .premium-card .card-meta{font-size:.76rem;line-height:1.5;}
    body[data-mode="premium"] .premium-mode .premium-card .premium-tag{font-size:calc(.875rem - 2px);}
    body[data-mode="premium"] .premium-mode .primary,body[data-mode="premium"] .premium-mode .secondary{font-size:calc(.92rem - 2px);}
    body[data-mode="premium"] .premium-mode .gemini-head h3{font-size:calc(1.25rem - 2px);}
    body[data-mode="premium"] .premium-mode .gemini-head .muted{font-size:calc(1rem - 2px);line-height:1.5;}
    body[data-mode="premium"] .premium-mode .gemini-form textarea{font-size:calc(1rem - 2px);line-height:1.5;}
    body[data-mode="premium"] .premium-mode .gemini-actions{font-size:calc(.92rem - 2px);}

    /* Reading rhythm and Android portrait scrolling. */
    body[data-mode="premium"] .premium-mode{overflow:visible!important;overflow-x:clip!important;touch-action:pan-y;overscroll-behavior-x:none;-webkit-overflow-scrolling:touch;}
    body[data-mode="premium"] .premium-mode,.premium-grid,.premium-card,.gemini-workspace{scroll-behavior:auto;}
    body[data-mode="premium"] .premium-mode .premium-card p,
    body[data-mode="premium"] .premium-mode .gemini-head .muted,
    body[data-mode="premium"] .premium-mode .gemini-form textarea{line-height:1.5;}
    @media (max-width:700px){
      body[data-mode="premium"] .premium-mode{margin-left:-20px;margin-right:-20px;padding:40px 10px 70px;min-height:calc(100dvh - 64px);}
      body[data-mode="premium"] .premium-mode .premium-hero{align-items:flex-start;flex-direction:column;gap:18px;padding-bottom:24px;}
      body[data-mode="premium"] .premium-mode .premium-hero h2{font-size:clamp(calc(2.35rem - 2px),calc(11vw - 2px),calc(3.9rem - 2px));}
      body[data-mode="premium"] .premium-mode .premium-hero .muted{max-width:none;}
      body[data-mode="premium"] .premium-mode .premium-toolbar{margin:18px 0 16px;gap:7px;}
      body[data-mode="premium"] .premium-mode .premium-grid{grid-template-columns:minmax(0,1fr);gap:12px;width:100%;}
      body[data-mode="premium"] .premium-mode .premium-card{grid-column:1 / -1;min-height:0;padding:18px;border-radius:12px;}
      body[data-mode="premium"] .premium-mode .premium-card img{width:calc(100% + 36px);height:auto;aspect-ratio:16/9;margin:-18px -18px 16px;}
      body[data-mode="premium"] .premium-mode .premium-card h3{font-size:calc(1.3rem - 2px);line-height:1.08;margin:14px 0 9px;}
      body[data-mode="premium"] .premium-mode .premium-card p{font-size:calc(1rem - 2px);line-height:1.5;}
      body[data-mode="premium"] .premium-mode .premium-news-pager{margin:22px 0 4px;gap:6px;}
      body[data-mode="premium"] .premium-mode .premium-news-pager .news-page{min-width:34px;min-height:34px;padding:6px 8px;}
      body[data-mode="premium"] .premium-mode .gemini-workspace{margin-left:0;margin-right:0;}
      body[data-mode="premium"] .premium-mode .premium-card:hover{transform:none;}
    }
    @supports not (height:100dvh){
      @media (max-width:700px){body[data-mode="premium"] .premium-mode{min-height:calc(100vh - 64px);}}
    }
    @media (prefers-reduced-motion:reduce){
      #premiumMode .premium-news-pager .news-page{transition:none;}
    }
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
  pager.innerHTML = basic.innerHTML;
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
  const observer = new MutationObserver(() => syncPremiumPager());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-mode'] });
  window.addEventListener('resize', syncPremiumPager, { passive: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
})();
