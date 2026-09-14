const { json, cors, requireUser, isOwner, supabaseFetch, dbJson } = require('../../lib/api');

function addOneMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const authHeader = req.headers.authorization || '';
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!isOwner(user)) return json(res, { error:'Owner access required.' }, 403);

    if (req.method === 'GET') {
      const subsRes = await supabaseFetch(
        `subscriptions?select=id,user_id,plan,status,access_ends_at,created_at,updated_at&order=updated_at.desc&limit=100`,
        { authHeader }
      );
      if (!subsRes.ok) return json(res, { error:'Could not load Premium customers.' }, 503);
      const subs = await dbJson(subsRes);
      const profilesRes = await supabaseFetch(
        `profiles?select=id,display_name,preferred_language&limit=1000`,
        { authHeader }
      );
      const profiles = profilesRes.ok ? await dbJson(profilesRes) : [];
      const byId = new Map((Array.isArray(profiles)?profiles:[]).map(p => [p.id, p]));
      const customers = (Array.isArray(subs)?subs:[]).map(s => ({
        ...s,
        display_name: byId.get(s.user_id)?.display_name || 'Premium user',
        preferred_language: byId.get(s.user_id)?.preferred_language || 'en'
      }));
      const counts = customers.reduce((a,s) => { a.total++; a[s.status] = (a[s.status]||0)+1; return a; }, { total:0, active:0, provisional:0, cancelled:0, expired:0, pending:0 });
      return json(res, { customers, counts });
    }

    if (req.method !== 'PATCH') return json(res, { error:'Method not allowed.' }, 405);
    const id = String(req.query?.id || '');
    if (!/^\d+$/.test(id)) return json(res, { error:'Invalid subscription ID.' }, 422);
    const action = req.body?.action;
    if (!['cancel','extend'].includes(action)) return json(res, { error:'Invalid subscription action.' }, 422);

    const found = await supabaseFetch(`subscriptions?id=eq.${encodeURIComponent(id)}&select=id,user_id,status,access_ends_at&limit=1`, { authHeader });
    const sub = found.ok ? (await dbJson(found))[0] : null;
    if (!sub) return json(res, { error:'Subscription not found.' }, 404);

    const now = new Date();
    if (action === 'cancel') {
      if (!['active','provisional'].includes(sub.status) || !sub.access_ends_at || new Date(sub.access_ends_at).getTime() <= now.getTime()) {
        return json(res, { error:'This Premium subscription is not currently active.' }, 409);
      }
      const updated = await supabaseFetch(`subscriptions?id=eq.${encodeURIComponent(id)}`, {
        method:'PATCH', authHeader, headers:{Prefer:'return=representation'},
        body:JSON.stringify({ status:'cancelled', updated_at:now.toISOString() })
      });
      if (!updated.ok) return json(res, { error:'Could not cancel this Premium subscription.' }, 503);
      return json(res, { ok:true, action:'cancel', subscription:{...sub,status:'cancelled'} });
    }

    if (!sub.access_ends_at) return json(res, { error:'This subscription has no expiry date to extend.' }, 409);
    const base = new Date(sub.access_ends_at).getTime() > now.getTime() ? new Date(sub.access_ends_at) : now;
    const ends = addOneMonth(base);
    const updated = await supabaseFetch(`subscriptions?id=eq.${encodeURIComponent(id)}`, {
      method:'PATCH', authHeader, headers:{Prefer:'return=representation'},
      body:JSON.stringify({ status:'active', access_ends_at:ends.toISOString(), updated_at:now.toISOString() })
    });
    if (!updated.ok) return json(res, { error:'Could not extend this Premium subscription.' }, 503);
    return json(res, { ok:true, action:'extend', subscription:{...sub,status:'active',access_ends_at:ends.toISOString()} });
  } catch (e) {
    return json(res, { error:e.message || 'Premium management request failed.' }, 500);
  }
};
