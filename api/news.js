const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');
module.exports = async (req, res) => {
  cors(req, res); if (req.method === 'OPTIONS') return res.status(204).end(); if (req.method !== 'GET') return json(res, { error: 'Method not allowed.' }, 405);
  try {
    const today = karachiDate();
    const r = await supabaseFetch(`news_posts?published_on=eq.${encodeURIComponent(today)}&is_published=eq.true&select=id,category,title_en,title_ur,excerpt_en,excerpt_ur,image_url,source_name,source_url,published_on,daily_rank,updated_at&order=daily_rank.asc&limit=5`);
    const data = await dbJson(r); if (!r.ok) return json(res, { error: 'News is temporarily unavailable.' }, 503);
    return json(res, { posts: Array.isArray(data) ? data : [], date: today, language: req.query?.lang === 'ur' ? 'ur' : 'en' });
  } catch (e) { return json(res, { error: e.message || 'News request failed.' }, 500); }
};
