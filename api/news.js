const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed.' }, 405);

  try {
    const today = karachiDate();
    const requestedDate = String(req.query?.date || today);
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : today;
    const select = 'id,category,title_en,title_ur,excerpt_en,excerpt_ur,image_url,source_name,source_url,published_on,daily_rank,updated_at';

    let r = await supabaseFetch(
      `news_posts?published_on=eq.${encodeURIComponent(targetDate)}&is_published=eq.true&select=${select}&order=daily_rank.asc&limit=5`
    );
    let data = await dbJson(r);
    if (!r.ok) return json(res, { error: 'News is temporarily unavailable.' }, 503);

    // If today's edition has not been published yet, keep the workspace useful
    // by serving the most recent published five-story edition instead of an empty grid.
    let effectiveDate = targetDate;
    if (!Array.isArray(data) || data.length === 0) {
      r = await supabaseFetch(
        `news_posts?is_published=eq.true&select=${select}&order=published_on.desc,daily_rank.asc&limit=5`
      );
      data = await dbJson(r);
      if (!r.ok) return json(res, { error: 'News is temporarily unavailable.' }, 503);
      effectiveDate = Array.isArray(data) && data[0]?.published_on ? data[0].published_on : targetDate;
    }

    return json(res, {
      posts: Array.isArray(data) ? data : [],
      date: effectiveDate,
      requestedDate: targetDate,
      isLatestAvailable: effectiveDate !== targetDate,
      language: req.query?.lang === 'ur' ? 'ur' : 'en'
    });
  } catch (e) {
    return json(res, { error: e.message || 'News request failed.' }, 500);
  }
};
