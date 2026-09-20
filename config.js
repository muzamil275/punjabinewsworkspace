window.PNW_CONFIG = {
  API_URL: '/api',
  SUPABASE_URL: 'https://mqxoegglwznspxsjydjo.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_5zNYDsB3-esKhjLhewBCBA_z1pnkWHn',
  OWNER_EMAIL: 'muzamil.275pk@gmail.com',
  PREMIUM_PRICE: 500,
  PAYMENT_EASYPAISA: '+92 342 5078246',
  PAYMENT_UBL: 'PK91UNIL0109000315081244'
};

(() => {
  'use strict';
  const originalFetch = window.fetch.bind(window);
  const inflight = new Map();
  window.fetch = (input, init) => {
    try {
      const request = new Request(input, init);
      const url = new URL(request.url, location.href);
      if (request.method === 'GET' && url.origin === location.origin && url.pathname === '/api/news') {
        const key = `${url.pathname}${url.search}`;
        if (inflight.has(key)) return inflight.get(key).then(response => response.clone());
        const requestPromise = originalFetch(request).finally(() => inflight.delete(key));
        inflight.set(key, requestPromise);
        return requestPromise.then(response => response.clone());
      }
    } catch {}
    return originalFetch(input, init);
  };
  const style = document.createElement('style');
  style.textContent = '#newsGrid{visibility:visible!important;}';
  document.head.appendChild(style);
})();