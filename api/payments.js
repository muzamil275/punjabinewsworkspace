const { json, cors, requireUser, supabaseFetch, dbJson, parseRequestBody, uploadProof, deleteProof, randomName } = require('../lib/api');
function extFor(type) { return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : type === 'application/pdf' ? 'pdf' : ''; }
function hasMagic(type, data) {
  if (!data || !data.length) return false;
  if (type === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === 'image/png') return data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  if (type === 'application/pdf') return data.length >= 5 && data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46 && data[4] === 0x2d;
  return false;
}
module.exports = async (req, res) => {
  cors(req, res); if (req.method === 'OPTIONS') return res.status(204).end(); if (req.method !== 'POST') return json(res, { error: 'Method not allowed.' }, 405);
  const authHeader = req.headers.authorization || '';
  try {
    const user = await requireUser(req, res); if (!user) return;
    const { fields, files } = await parseRequestBody(req); const method = String(fields.method || '').trim(), transactionId = String(fields.transactionId || '').trim(); const file = files.find(f => f.name === 'proof'); const ext = extFor(file?.contentType); const price = Number(process.env.PREMIUM_PRICE || 500);
    if (!['easypaisa','ubl'].includes(method) || !/^[A-Za-z0-9-]{6,80}$/.test(transactionId) || !file || !file.data?.length || file.data.length > 5 * 1024 * 1024 || !ext || !hasMagic(file.contentType, file.data) || !Number.isFinite(price) || price <= 0) return json(res, { error: 'Use a valid transaction ID and a genuine JPG, PNG, or PDF proof under 5 MB.' }, 422);
    const active = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&access_ends_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id&limit=1`, { authHeader }); if (active.ok && (await dbJson(active)).length) return json(res, { error: 'Your Premium access is already active.' }, 409);
    const pending = await supabaseFetch(`payments?user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&select=id&limit=1`, { authHeader }); if (pending.ok && (await dbJson(pending)).length) return json(res, { error: 'You already have a payment awaiting owner verification.' }, 409);
    const duplicate = await supabaseFetch(`payments?transaction_id=eq.${encodeURIComponent(transactionId)}&status=in.(pending,approved)&select=id&limit=1`, { authHeader }); if (duplicate.ok && (await dbJson(duplicate)).length) return json(res, { error: 'This transaction ID has already been submitted. Please use the correct transaction ID.' }, 409);
    const objectKey = `${user.id}/${randomName(ext)}`;
    try {
      await uploadProof(objectKey, file, authHeader);
    } catch {
      try { await deleteProof(objectKey, authHeader); } catch {}
      return json(res, { error: 'Could not save the payment proof. Nothing was submitted; please try again.' }, 503);
    }
    try {
      const payment = await supabaseFetch('payments', { method: 'POST', authHeader, headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: user.id, method, transaction_id: transactionId, proof_path: objectKey, amount: price, status: 'pending' }) });
      const paymentRows = await dbJson(payment);
      if (!payment.ok) {
        try { await deleteProof(objectKey, authHeader); } catch {}
        if (payment.status === 409 || paymentRows?.code === '23505') return json(res, { error: 'This transaction ID has already been submitted. Please check the transaction ID and try again.' }, 409);
        return json(res, { error: 'Could not save your payment submission. Your proof was not kept. Please try again.' }, 503);
      }
      const paymentId = paymentRows?.[0]?.id;
      const existingSub = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`, { authHeader }); const rows = existingSub.ok ? await dbJson(existingSub) : [];
      const subBody = { plan:'premium', status:'pending', access_ends_at:null, updated_at:new Date().toISOString() };
      const sub = rows.length
        ? await supabaseFetch(`subscriptions?id=eq.${encodeURIComponent(rows[0].id)}`, { method:'PATCH', authHeader, headers:{Prefer:'return=minimal'}, body:JSON.stringify(subBody) })
        : await supabaseFetch('subscriptions', { method:'POST', authHeader, headers:{Prefer:'return=minimal'}, body:JSON.stringify({user_id:user.id,...subBody}) });
      if (!sub.ok) {
        if (paymentId) await supabaseFetch(`payments?id=eq.${encodeURIComponent(paymentId)}`, { method:'PATCH', authHeader, headers:{Prefer:'return=minimal'}, body:JSON.stringify({ status:'rejected', reviewed_at:null, reviewed_by:null }) });
        try { await deleteProof(objectKey, authHeader); } catch {}
        return json(res, { error: 'Could not create the Premium subscription record. Your payment submission was rolled back; please try again.' }, 503);
      }
      return json(res, { message: 'Payment proof submitted. Premium will be activated after owner verification.' }, 201);
    } catch (error) {
      return json(res, { error: error.message || 'Payment submission failed. Please try again.' }, 500);
    }
  } catch (e) { return json(res, { error: e.message || 'Payment submission failed. Please try again.' }, 500); }
};
module.exports.config = { api: { bodyParser: false } };
