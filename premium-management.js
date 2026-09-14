(() => {
  'use strict';
  const q = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[x]));
  const token = () => localStorage.getItem('pnw_token') || '';
  const api = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (token()) headers.set('Authorization', `Bearer ${token()}`);
    const r = await fetch(url, {...options, headers, cache:'no-store'});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Request failed.');
    return d;
  };
  const showToast = (text, kind='success') => {
    const t = q('#toast'); if (!t) return;
    t.textContent = text; t.className = `toast ${kind}`; t.classList.remove('hidden');
    clearTimeout(window.__pnwPremiumToast); window.__pnwPremiumToast = setTimeout(() => t.classList.add('hidden'), 4200);
  };
  const close = () => { const r=q('#modalRoot'); if (!r) return; r.classList.add('hidden'); r.setAttribute('aria-hidden','true'); r.innerHTML=''; };
  const open = html => {
    const r=q('#modalRoot'); if (!r) return;
    r.innerHTML=`<div class="modal workspace-overlay premium-management-modal" role="dialog" aria-modal="true">${html}</div>`;
    r.classList.remove('hidden'); r.setAttribute('aria-hidden','false'); r.querySelector('.close')?.addEventListener('click',close);
  };
  const fmt = d => d ? new Date(d).toLocaleDateString(document.documentElement.lang==='ur'?'ur-PK':'en-PK',{dateStyle:'medium'}) : 'No expiry';
  const daysLeft = d => d ? Math.max(0, Math.ceil((new Date(d).getTime()-Date.now())/86400000)) : null;

  function installManagementStyle() {
    if (q('#pnw-premium-management-style')) return;
    const style=document.createElement('style'); style.id='pnw-premium-management-style';
    style.textContent=`.premium-management-modal .account-premium-summary{display:grid;gap:4px;padding:14px 16px;border:1px solid var(--premium-line,#26303d);border-radius:12px;background:var(--premium-surface,#0b1018);margin:14px 0}.premium-management-modal .account-premium-summary strong{text-transform:capitalize}.premium-management-modal .account-actions{display:flex;gap:10px;flex-wrap:wrap}.premium-management-modal .premium-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:16px 0}.premium-management-modal .premium-stats span{display:grid;gap:2px;padding:10px;border:1px solid var(--premium-line,#26303d);border-radius:10px;text-align:center}.premium-management-modal .premium-customer-list{display:grid;gap:9px;margin-top:12px;max-height:52vh;overflow:auto}.premium-management-modal .premium-customer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--premium-line,#26303d);border-radius:12px;background:var(--premium-surface,#0b1018)}.premium-management-modal .premium-customer>div:first-child{display:grid;gap:3px;min-width:0}.premium-management-modal .premium-customer span{font-size:.84rem;color:var(--premium-muted,#9aa4b2);overflow-wrap:anywhere}.premium-management-modal .customer-id{font-size:.72rem;opacity:.72}.premium-management-modal .customer-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.premium-management-modal .premium-owner-toolbar{display:flex;justify-content:flex-end;margin-bottom:6px}.premium-management-modal .premium-manage-history{display:grid;gap:7px;margin-top:14px}.premium-management-modal .premium-manage-history .payment-method{display:grid;gap:3px}.premium-management-modal .premium-manage-history small{opacity:.7}@media(max-width:600px){.premium-management-modal .premium-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.premium-management-modal .premium-customer{align-items:flex-start;flex-direction:column}.premium-management-modal .customer-actions{width:100%;justify-content:flex-start}}`;
    document.head.appendChild(style);
  }

  async function openUserManager() {
    try {
      const me = await api('/me');
      if (me.user?.isOwner) return openOwnerManager();
      const data = await api('/subscription');
      const s = data.subscription;
      const status = s?.status === 'cancelled' ? 'Cancellation scheduled' : s?.status === 'provisional' ? 'Awaiting payment verification' : s?.active ? 'Active' : 'Not active';
      const paymentRows = Array.isArray(data.payments) && data.payments.length ? data.payments.map(p => `<div class="payment-method"><b>${esc((p.method||'').toUpperCase())}</b><span>${esc(p.status)} · ${esc(p.transaction_id)} · Rs ${esc(p.amount)}</span><small>${esc(fmt(p.created_at))}</small></div>`).join('') : '<p class="muted">No payment history available yet.</p>';
      open(`<button class="close" type="button" aria-label="Close">×</button><span class="auth-premium-kicker">PREMIUM</span><h2 id="manage-premium-title">Manage Premium</h2><div class="account-premium-summary"><strong>${esc(status)}</strong><span>${s?.access_ends_at ? `Access until ${esc(fmt(s.access_ends_at))} · ${daysLeft(s.access_ends_at)} day(s) left` : 'Your Premium access is active.'}</span></div>${s?.status==='cancelled' ? '<p>Your Premium is cancelled and will not renew. Access stays available until the current expiry date.</p>' : s?.active ? '<p>Manage your access below. Cancelling prevents continued Premium access after the current period.</p>' : '<p>Your Premium subscription is not currently active.</p>'}<div class="account-actions">${s?.active && s?.status!=='cancelled' ? '<button class="primary" type="button" id="userCancelPremium">Cancel Premium</button>' : ''}<button class="secondary" type="button" id="userPaymentHistory">Payment history</button></div><div id="userPayments" class="premium-manage-history hidden">${paymentRows}</div>`);
      q('#userPaymentHistory')?.addEventListener('click', () => q('#userPayments')?.classList.toggle('hidden'));
      q('#userCancelPremium')?.addEventListener('click', () => confirmUserCancel(s.access_ends_at));
    } catch(e) { showToast(e.message || 'Could not load Premium management.','error'); }
  }

  function confirmUserCancel(accessEnds) {
    open(`<button class="close" type="button" aria-label="Close">×</button><span class="auth-premium-kicker">PREMIUM</span><h2>Cancel Premium</h2><p>Do you want to cancel your Premium subscription?</p><p class="muted">Your current access remains available until ${esc(fmt(accessEnds))}.</p><div class="account-actions"><button class="secondary" type="button" id="cancelNo">No</button><button class="primary" type="button" id="cancelYes">Yes, cancel</button></div>`);
    q('#cancelNo').onclick = close;
    q('#cancelYes').onclick = async () => {
      const b=q('#cancelYes'); b.disabled=true; b.textContent='Cancelling…';
      try { await api('/subscription',{method:'POST'}); close(); showToast('Premium cancelled. Access remains available until your current expiry date.'); setTimeout(()=>location.reload(),450); }
      catch(e){ b.disabled=false; b.textContent='Yes, cancel'; showToast(e.message||'Could not cancel Premium.','error'); }
    };
  }

  async function openOwnerManager() {
    try {
      const data = await api('/admin/subscriptions');
      const counts=data.counts||{};
      const customers=Array.isArray(data.customers)?data.customers:[];
      const active=customers.filter(s=>['active','provisional','cancelled'].includes(s.status));
      const rows=active.length ? active.map(s=>`<article class="premium-customer" data-id="${esc(s.id)}"><div><strong>${esc(s.display_name||'Premium user')}</strong><span>${esc(s.status)}${s.access_ends_at?` · until ${esc(fmt(s.access_ends_at))}`:''}</span><small class="customer-id">ID: ${esc(String(s.user_id||'').slice(0,12))}…</small></div><div class="customer-actions">${['active','provisional'].includes(s.status)?'<button class="secondary" type="button" data-owner-cancel>Cancel</button>':''}${s.access_ends_at?'<button class="primary" type="button" data-owner-extend>+1 month</button>':''}</div></article>`).join('') : '<p class="muted">No Premium customers found.</p>';
      open(`<button class="close" type="button" aria-label="Close">×</button><span class="auth-premium-kicker">OWNER AREA</span><h2>Premium Management</h2><div class="premium-stats"><span><b>${esc(counts.active||0)}</b>Active</span><span><b>${esc(counts.provisional||0)}</b>Pending</span><span><b>${esc(counts.cancelled||0)}</b>Cancelled</span><span><b>${esc(counts.total||0)}</b>Total</span></div><div class="premium-owner-toolbar"><button class="secondary" type="button" id="ownerRefresh">Refresh</button></div><div class="premium-customer-list">${rows}</div>`);
      q('#ownerRefresh').onclick = openOwnerManager;
      q('.premium-customer-list').querySelectorAll('[data-owner-cancel]').forEach(b => b.onclick=()=>ownerCancel(b.closest('[data-id]')?.dataset.id));
      q('.premium-customer-list').querySelectorAll('[data-owner-extend]').forEach(b => b.onclick=()=>ownerExtend(b.closest('[data-id]')?.dataset.id));
    } catch(e) { showToast(e.message || 'Could not load owner Premium management.','error'); }
  }

  function ownerConfirm(action,id) {
    const isCancel=action==='cancel';
    open(`<button class="close" type="button" aria-label="Close">×</button><span class="auth-premium-kicker">OWNER</span><h2>${isCancel?'Cancel Premium':'Extend Premium'}</h2><p>${isCancel?'Do you want to cancel Premium for this user?':'Add one month of Premium access for this user?'}</p><div class="account-actions"><button class="secondary" type="button" id="ownerNo">No</button><button class="primary" type="button" id="ownerYes">${isCancel?'Yes, cancel':'Yes, extend'}</button></div>`);
    q('#ownerNo').onclick=close;
    q('#ownerYes').onclick=async()=>{
      const b=q('#ownerYes'); b.disabled=true; b.textContent=isCancel?'Cancelling…':'Extending…';
      try { const d=await api(`/admin/subscriptions?id=${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}); close(); showToast(isCancel?'Premium cancelled for the user.':`Premium extended until ${fmt(d.subscription?.access_ends_at)}.`); setTimeout(openOwnerManager,350); }
      catch(e){ b.disabled=false; b.textContent=isCancel?'Yes, cancel':'Yes, extend'; showToast(e.message || 'Action failed.','error'); }
    };
  }
  const ownerCancel=id => id && ownerConfirm('cancel',id);
  const ownerExtend=id => id && ownerConfirm('extend',id);

  installManagementStyle();
  window.PNW_PREMIUM_MANAGE = openUserManager;
})();
