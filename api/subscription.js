const { json, cors, requireUser, isOwner, supabaseFetch, dbJson } = require('../lib/api');

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const authHeader = req.headers.authorization || '';
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const found = await supabaseFetch(
        `subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id,plan,status,access_ends_at,created_at,updated_at&limit=1`,
        { authHeader }
      );
      if (!found.ok) return json(res, { error: 'Could not load your Premium subscription.' }, 503);
      const rows = await dbJson(found);
      const sub = rows[0] || null;
      const paymentsFound = await supabaseFetch(
        `payments?user_id=eq.${encodeURIComponent(user.id)}&select=id,method,transaction_id,amount,status,created_at,reviewed_at&order=created_at.desc&limit=20`,
        { authHeader }
      );
      const payments = paymentsFound.ok ? await dbJson(paymentsFound) : [];
      if (isOwner(user)) {
        return json(res, {
          owner: true,
          subscription: { plan:'premium', status:'active', access_ends_at:null, active:true, owner:true },
          payments: Array.isArray(payments) ? payments : []
        });
      }
      const active = Boolean(sub && ['active','provisional'].includes(sub.status) && sub.access_ends_at && new Date(sub.access_ends_at).getTime() > Date.now());
      return json(res, { owner:false, subscription: sub ? { ...sub, active } : null, payments: Array.isArray(payments) ? payments : [] });
    }

    if (req.method !== 'POST') return json(res, { error: 'Method not allowed.' }, 405);
    if (isOwner(user)) return json(res, { error: 'Owner accounts are managed separately.' }, 403);

    const found = await supabaseFetch(
      `subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id,status,access_ends_at&limit=1`,
      { authHeader }
    );
    if (!found.ok) return json(res, { error: 'Could not load your Premium subscription.' }, 503);
    const rows = await dbJson(found);
    const sub = rows[0] || null;
    if (!sub || !['active', 'provisional'].includes(sub.status) || !sub.access_ends_at || new Date(sub.access_ends_at).getTime() <= Date.now()) {
      return json(res, { error: 'There is no active Premium subscription to cancel.' }, 409);
    }

    const updated = await supabaseFetch(
      `subscriptions?id=eq.${encodeURIComponent(sub.id)}`,
      {
        method: 'PATCH', authHeader, headers: { Prefer:'return=minimal' },
        body: JSON.stringify({ status:'cancelled', updated_at:new Date().toISOString() })
      }
    );
    if (!updated.ok) return json(res, { error: 'Could not cancel Premium. Please try again.' }, 503);
    return json(res, { ok:true, status:'cancelled', access_ends_at:sub.access_ends_at, message:'Premium has been cancelled. Your access remains available until the current expiry date.' });
  } catch (e) {
    return json(res, { error:e.message || 'Subscription request failed.' }, 500);
  }
};
