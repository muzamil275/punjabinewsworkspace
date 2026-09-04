const { json, cors, requireUser, isOwner, supabaseFetch, dbJson } = require('../../lib/api');
module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed.' }, 405);
  try {
    const user = await requireUser(req, res); if (!user) return;
    if (!isOwner(user)) return json(res, { error: 'Owner access required.' }, 403);
    const r = await supabaseFetch('payments?status=eq.pending&select=id,user_id,method,transaction_id,amount,status,created_at&order=created_at.asc');
    const data = await dbJson(r);
    if (!r.ok) return json(res, { error: 'Payment queue unavailable.' }, 503);
    return json(res, { payments: data });
  } catch (e) { return json(res, { error: e.message || 'Payment queue request failed.' }, 500); }
};
