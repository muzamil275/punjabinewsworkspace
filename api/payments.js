const { json, cors, requireUser, supabaseFetch, dbJson, parseRequestBody, ensureBucket, uploadProof, deleteProof, randomName } = require('../lib/api');
function extFor(type) { return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : type === 'application/pdf' ? 'pdf' : ''; }
module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed.' }, 405);
  try {
    const user = await requireUser(req, res); if (!user) return;
    const { fields, files } = await parseRequestBody(req);
    const method = String(fields.method || '');
    const transactionId = String(fields.transactionId || '').trim();
    const file = files.find(f => f.name === 'proof');
    const ext = extFor(file?.contentType);
    if (!['easypaisa','ubl'].includes(method) || !/^[A-Za-z0-9-]{6,80}$/.test(transactionId) || !file || file.data.length > 5 * 1024 * 1024 || !ext) return json(res, { error: 'Use a valid transaction ID and a JPG, PNG, or PDF proof under 5 MB.' }, 422);

    const active = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&access_ends_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id&limit=1`);
    if (active.ok && (await dbJson(active)).length) return json(res, { error: 'Your Premium access is already active.' }, 409);
    const pending = await supabaseFetch(`payments?user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&select=id&limit=1`);
    if (pending.ok && (await dbJson(pending)).length) return json(res, { error: 'You already have a payment awaiting owner verification.' }, 409);

    await ensureBucket();
    const objectKey = `${user.id}/${randomName(ext)}`;
    await uploadProof(objectKey, file);
    const payment = await supabaseFetch('payments', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: user.id, method, transaction_id: transactionId, proof_path: objectKey, amount: 500, status: 'pending' }) });
    if (!payment.ok) { await deleteProof(objectKey); return json(res, { error: 'Could not save payment proof. Please try again.' }, 503); }
    const existingSub = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`);
    const subRows = existingSub.ok ? await dbJson(existingSub) : [];
    if (subRows.length) {
      await supabaseFetch(`subscriptions?id=eq.${encodeURIComponent(subRows[0].id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ plan: 'premium', status: 'pending', access_ends_at: null, updated_at: new Date().toISOString() }) });
    } else {
      await supabaseFetch('subscriptions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: user.id, plan: 'premium', status: 'pending', access_ends_at: null }) });
    }
    return json(res, { message: 'Payment proof submitted. Premium will be activated after owner verification.' }, 201);
  } catch (e) { return json(res, { error: e.message || 'Payment submission failed.' }, 500); }
};
module.exports.config = { api: { bodyParser: false } };
