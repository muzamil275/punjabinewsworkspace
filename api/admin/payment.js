const { json, cors, requireUser, isOwner, supabaseFetch, dbJson } = require('../../lib/api');
module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const id = String(req.query?.id || '');
  if (!/^\d+$/.test(id)) return json(res, { error: 'Invalid payment ID.' }, 422);
  const authHeader = req.headers.authorization || '';
  try {
    const user = await requireUser(req, res); if (!user) return;
    if (!isOwner(user)) return json(res, { error: 'Owner access required.' }, 403);
    if (req.method === 'PATCH') {
      const action = req.body?.action;
      if (!['approve', 'reject'].includes(action)) return json(res, { error: 'Invalid review action.' }, 422);
      const found = await supabaseFetch(`payments?id=eq.${encodeURIComponent(id)}&select=id,user_id,status&limit=1`, { authHeader });
      const payment = found.ok ? (await dbJson(found))[0] : null;
      if (!payment || payment.status !== 'pending') return json(res, { error: 'This payment cannot be reviewed.' }, 404);
      const status = action === 'approve' ? 'approved' : 'rejected';
      const updated = await supabaseFetch(`payments?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', authHeader, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }) });
      if (!updated.ok) return json(res, { error: 'Could not update payment.' }, 503);
      const existing = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(payment.user_id)}&select=id&limit=1`, { authHeader });
      const rows = existing.ok ? await dbJson(existing) : [];
      let ends = null;
      if (action === 'approve') {
        const prior = await supabaseFetch(`payments?user_id=eq.${encodeURIComponent(payment.user_id)}&status=eq.approved&id=neq.${encodeURIComponent(id)}&select=id&limit=1`, { authHeader });
        const months = prior.ok && (await dbJson(prior)).length === 0 ? 2 : 1;
        ends = new Date();
        ends.setMonth(ends.getMonth() + months);
      }
      const body = { plan: 'premium', status: action === 'approve' ? 'active' : 'rejected', access_ends_at: ends ? ends.toISOString() : null, updated_at: new Date().toISOString() };
      if (rows.length) {
        const subUpdate = await supabaseFetch(`subscriptions?id=eq.${encodeURIComponent(rows[0].id)}`, { method: 'PATCH', authHeader, headers: { Prefer: 'return=minimal' }, body: JSON.stringify(body) });
        if (!subUpdate.ok) return json(res, { error: 'Payment updated but subscription update failed.' }, 503);
      } else {
        const subCreate = await supabaseFetch('subscriptions', { method: 'POST', authHeader, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: payment.user_id, ...body }) });
        if (!subCreate.ok) return json(res, { error: 'Payment updated but subscription activation failed.' }, 503);
      }
      return json(res, { ok: true, status });
    }
    if (req.method === 'GET') {
      const found = await supabaseFetch(`payments?id=eq.${encodeURIComponent(id)}&select=proof_path&limit=1`, { authHeader });
      const payment = found.ok ? (await dbJson(found))[0] : null;
      if (!payment?.proof_path) return json(res, { error: 'Proof not found.' }, 404);
      const path = String(payment.proof_path).split('/').map(encodeURIComponent).join('/');
      const file = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/payment-proofs/${path}`, { headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: authHeader } });
      if (!file.ok) return json(res, { error: 'Proof file not found.' }, 404);
      res.statusCode = 200; res.setHeader('Content-Type', file.headers.get('content-type') || 'application/octet-stream'); res.setHeader('Content-Disposition', 'inline');
      return res.end(Buffer.from(await file.arrayBuffer()));
    }
    return json(res, { error: 'Method not allowed.' }, 405);
  } catch (e) { return json(res, { error: e.message || 'Payment request failed.' }, 500); }
};
