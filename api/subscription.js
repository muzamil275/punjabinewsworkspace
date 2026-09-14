const { json, cors, requireUser, isOwner, supabaseFetch, dbJson } = require('../lib/api');

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed.' }, 405);
  const authHeader = req.headers.authorization || '';
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (isOwner(user)) return json(res, { ok: true, owner: true, message: 'Owner Premium access is permanent and cannot be cancelled.' });

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
        method: 'PATCH',
        authHeader,
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() })
      }
    );
    if (!updated.ok) return json(res, { error: 'Could not cancel Premium. Please try again.' }, 503);
    return json(res, { ok: true, status: 'cancelled', access_ends_at: sub.access_ends_at, message: 'Premium has been cancelled.' });
  } catch (e) {
    return json(res, { error: e.message || 'Subscription request failed.' }, 500);
  }
};
