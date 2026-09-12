const { json, cors, requireUser, supabaseFetch, dbJson, parseRequestBody, uploadProof, deleteProof, randomName } = require('../lib/api');
function extFor(type) { return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : type === 'application/pdf' ? 'pdf' : ''; }
module.exports = async (req, res) => {
  cors(req, res); if (req.method === 'OPTIONS') return res.status(204).end(); if (req.method !== 'POST') return json(res, { error: 'Method not allowed.' }, 405);
  const authHeader = req.headers.authorization || '';
  try {
    const user = await requireUser(req, res); if (!user) return;
    const { fields, files } = await parseRequestBody(req); const method = String(fields.method || ''), transactionId = String(fields.transactionId || '').trim(); const file = files.find(f => f.name === 'proof'); const ext = extFor(file?.contentType); const price = Number(process.env.PREMIUM_PRICE || 500);
    if (!['easypaisa','ubl'].includes(method) || !/^[A-Za-z0-9-]{6,80}$/.test(transactionId) || !file || file.data.length > 5 * 1024 * 1024 || !ext || !Number.isFinite(price) || price <= 0) return json(res, { error: 'Use a valid transaction ID and a JPG, PNG, or PDF proof under 5 MB.' }, 422);
    const active = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&access_ends_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id&limit=1`, { authHeader }); if (active.ok && (await dbJson(active)).length) return json(res, { error: 'Your Premium access is already active.' }, 409);
    const pending = await supabaseFetch(`payments?user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&select=id&limit=1`, { authHeader }); if (pending.ok && (await dbJson(pending)).length) return json(res, { error: 'You already have a payment awaiting owner verification.' }, 409);
    const duplicate = await supabaseFetch(`payments?transaction_id=eq.${encodeURIComponent(transactionId)}&status=in.(pending,approved)&select=id&limit=1`, { authHeader }); if (duplicate.ok && (await dbJson(duplicate)).length) return json(res, { error: 'This transaction ID has already been submitted. Please check the transaction ID and try again.' }, 409);
    const objectKey = `${user.id}/${randomName(ext)}`; await uploadProof(objectKey, file, authHeader);
    const payment = await supabaseFetch('payments', { method: 'POST', authHeader, headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: user.id, method, transaction_id: transactionId, proof_path: objectKey, amount: price, status: 'pending' }) });
    if (!payment.ok) { await deleteProof(objectKey, authHeader); return json(res, { error: 'Could not save payment proof. Please try again.' }, 503); }
    const paymentRows = await dbJson(payment); const paymentId = paymentRows?.[0]?.id;
    const existingSub = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`, { authHeader }); const rows = existingSub.ok ? await dbJson(existingSub) : [];
    const subBody = { plan:'premium', status:'pending', access_ends_at:null, updated_at:new Date().toISOString() };
    const sub = rows.length
      ? await supabaseFetch(`subscriptions?id=eq.${encodeURIComponent(rows[0].id)}`, { method:'PATCH', authHeader, headers:{Prefer:'return=minimal'}, body:JSON.stringify(subBody) })
      : await supabaseFetch('subscriptions', { method:'POST', authHeader, headers:{Prefer:'return=minimal'}, body:JSON.stringify({user_id:user.id,...subBody}) });
    if (!sub.ok) {
      if (paymentId) await supabaseFetch(`payments?id=eq.${encodeURIComponent(paymentId)}`, { method:'PATCH', authHeader, headers:{Prefer:'return=minimal'}, body:JSON.stringify({ status:'rejected', reviewed_at:null, reviewed_by:null }) });
      await deleteProof(objectKey, authHeader);
      return json(res, { error: 'Could not create the Premium subscription record. The payment was not left pending; please try again.' }, 503);
    }
    return json(res, { message: 'Payment proof submitted. Premium will be activated after owner verification.' }, 201);
  } catch (e) { return json(res, { error: e.message || 'Payment submission failed.' }, 500); }
};
module.exports.config = { api: { bodyParser: false } };
