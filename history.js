(() => {
  'use strict';
  const q = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[x]));
  const KEY = 'pnw_gemini_activity_v1';
  const LEGACY_KEY = 'pnw_activity_history';
  let activities = [];

  const emailSuffix = () => (localStorage.getItem('pnw_saved_email') || 'guest').toLowerCase();
  const storageKey = key => `${key}:${emailSuffix()}`;
  const now = () => new Date().toISOString();
  const labelDate = value => new Date(value).toLocaleString(
    document.documentElement.lang === 'ur' ? 'ur-PK' : 'en-PK',
    { dateStyle: 'medium', timeStyle: 'short' }
  );

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(KEY)) || 'null');
      if (Array.isArray(saved)) return saved.slice(0, 50);
      // Preserve older Gemini activity entries without bringing old news/search/mode activity into this panel.
      const legacy = JSON.parse(localStorage.getItem(storageKey(LEGACY_KEY)) || '[]');
      const migrated = Array.isArray(legacy)
        ? legacy.filter(item => item?.type === 'Gemini' && typeof item.title === 'string').slice(0, 50).map(item => ({
            id: item.id || `${Date.now()}-${Math.random()}`,
            prompt: item.title,
            response: '',
            edition: item.detail || '',
            time: item.time || now()
          }))
        : [];
      if (migrated.length) localStorage.setItem(storageKey(KEY), JSON.stringify(migrated));
      return migrated;
    } catch {
      return [];
    }
  }

  function save() {
    try { localStorage.setItem(storageKey(KEY), JSON.stringify(activities.slice(0, 50))); } catch {}
  }

  function addStyles() {
    if (q('#geminiActivityStyles')) return;
    const style = document.createElement('style');
    style.id = 'geminiActivityStyles';
    style.textContent = `
      .gemini-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      .gemini-activity-panel{margin:0 0 18px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--paper);color:var(--ink)}
      .gemini-activity-panel.hidden{display:none}
      .gemini-activity-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--line)}
      .gemini-activity-heading{display:grid;gap:3px}
      .gemini-activity-heading strong{font-size:.92rem}
      .gemini-activity-heading span{font-size:.76rem;color:var(--muted)}
      .gemini-activity-head-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .gemini-activity-head-actions button{min-height:38px}
      .gemini-activity-list{display:grid;gap:10px;max-height:360px;overflow:auto;padding-top:12px;overscroll-behavior:contain}
      .gemini-activity-entry{padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--paper-2);overflow-wrap:anywhere}
      .gemini-activity-label{font-size:.66rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
      .gemini-activity-prompt{font-weight:750;line-height:1.45;white-space:pre-wrap}
      .gemini-activity-response{margin-top:10px;padding-top:9px;border-top:1px solid var(--line);font-size:.88rem;line-height:1.55;white-space:pre-wrap}
      .gemini-activity-edition{margin-top:7px;color:var(--muted);font-size:.72rem}
      .gemini-activity-entry time{display:block;margin-top:8px;color:var(--muted);font-size:.7rem}
      .gemini-activity-empty{padding:24px 8px;text-align:center;color:var(--muted);font-size:.86rem}
      body[data-mode="premium"] .gemini-activity-panel{background:var(--premium-surface);border-color:var(--premium-line);color:var(--premium-text)}
      body[data-mode="premium"] .gemini-activity-entry{background:var(--premium-surface-2);border-color:var(--premium-line)}
      body[data-mode="premium"] .gemini-activity-response{border-color:var(--premium-line)}
      @media(max-width:760px){.gemini-head-actions{justify-content:flex-start}.gemini-activity-head{align-items:flex-start;flex-direction:column}.gemini-activity-head-actions{width:100%}.gemini-activity-head-actions button{flex:1}}
      @media(prefers-reduced-motion:reduce){.gemini-activity-panel{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    const list = q('#geminiActivityList');
    if (!list) return;
    list.innerHTML = activities.length
      ? activities.slice(0, 50).map(item => `
          <article class="gemini-activity-entry">
            <div class="gemini-activity-label">You asked Gemini</div>
            <div class="gemini-activity-prompt">${esc(item.prompt)}</div>
            ${item.response ? `<div class="gemini-activity-response"><div class="gemini-activity-label">Gemini response</div>${esc(item.response)}</div>` : ''}
            ${item.edition ? `<div class="gemini-activity-edition">${esc(item.edition)}</div>` : ''}
            <time datetime="${esc(item.time)}">${esc(labelDate(item.time))}</time>
          </article>`
        ).join('')
      : '<div class="gemini-activity-empty">No Gemini activity yet. Your questions and Gemini responses will appear here.</div>';
  }

  function addGeminiActivity(event) {
    const detail = event.detail || {};
    const prompt = typeof detail.prompt === 'string' ? detail.prompt.trim() : '';
    if (!prompt) return;
    activities.unshift({
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      prompt,
      response: typeof detail.response === 'string' ? detail.response : '',
      edition: detail.newsDate ? `News edition: ${detail.newsDate}` : '',
      time: now()
    });
    activities = activities.slice(0, 50);
    save();
    render();
  }

  function togglePanel(forceOpen) {
    const panel = q('#geminiActivityPanel');
    const button = q('#geminiActivityToggle');
    if (!panel || !button) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !shouldOpen);
    button.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen) render();
  }

  function init() {
    const workspace = q('#geminiWorkspace');
    const toggle = q('#geminiActivityToggle');
    const panel = q('#geminiActivityPanel');
    if (!workspace || !toggle || !panel) return;
    addStyles();
    activities = load();
    render();
    toggle.addEventListener('click', () => togglePanel());
    q('#geminiActivityClose')?.addEventListener('click', () => togglePanel(false));
    q('#geminiActivityClear')?.addEventListener('click', () => {
      activities = [];
      save();
      render();
    });
    window.addEventListener('pnw:gemini-asked', addGeminiActivity);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once: true })
    : init();
})();
