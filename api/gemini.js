const { json, cors, requireUser, isOwner, supabaseFetch, dbJson, safeText, karachiDate } = require('../lib/api');
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed.' }, 405);
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const owner = isOwner(user);
    if (!owner) {
      const r = await supabaseFetch(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=status,access_ends_at&limit=1`, { authHeader: req.headers.authorization || '' });
      const rows = r.ok ? await dbJson(r) : [];
      const sub = rows[0] || null;
      const active = Boolean(sub && new Date(sub.access_ends_at).getTime() > Date.now() && ['provisional', 'active'].includes(sub.status));
      if (!active) return json(res, { error: 'Active Premium access is required for Gemini.' }, 403);
    }
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return json(res, { error: 'Gemini is not configured on the server yet.' }, 503);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const prompt = safeText(body.prompt, 5000);
    if (!prompt) return json(res, { error: 'Enter a prompt first.' }, 422);

    let context = '';
    const today = karachiDate();
    const news = await supabaseFetch(`news_posts?published_on=eq.${encodeURIComponent(today)}&is_published=eq.true&select=category,title_en,title_ur,excerpt_en,excerpt_ur,source_name,source_url,daily_rank&order=daily_rank.asc&limit=5`, { authHeader: req.headers.authorization || '' });
    if (news.ok) {
      const rows = await dbJson(news);
      if (Array.isArray(rows) && rows.length) {
        context = rows.map((p, i) => `${i + 1}. [${p.category || 'News'}] ${p.title_en || ''} — ${p.excerpt_en || ''}${p.source_name ? ` (Source: ${p.source_name})` : ''}`).join('\n');
      }
    }

    const instruction = `You are the AI assistant inside Punjabi News Workspace. Give concise, accurate, useful answers. The user may ask for today's news. When they do, use the CURRENT WORKSPACE NEWS below as the primary source and summarize it directly. Do not claim that you lack internet access when workspace news is provided. Do not invent breaking news or sources. If the workspace news is empty, clearly say the workspace has no published stories for today.\n\nCurrent workspace date (Asia/Karachi): ${today}\nCurrent workspace news:\n${context || '(No published workspace news found.)'}\n\nUser request:\n${prompt}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: instruction }] }] })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Gemini API error', response.status, data?.error?.message || 'unknown');
      return json(res, { error: 'Gemini could not complete the request. Please try again.' }, response.status >= 400 && response.status < 500 ? 502 : 503);
    }
    const text = Array.isArray(data?.candidates?.[0]?.content?.parts) ? data.candidates[0].content.parts.map(part => part?.text || '').join('').trim() : '';
    if (!text) return json(res, { error: 'Gemini returned an empty response.' }, 502);
    return json(res, { model: MODEL, text }, 200);
  } catch (e) {
    console.error('Gemini route error', e);
    return json(res, { error: 'Gemini request failed.' }, 500);
  }
};
