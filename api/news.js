const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');

const FALLBACK_IMAGES = {
  sport: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80',
  rain: 'https://humenglish341f88e60e.blob.core.windows.net/humenglish/uploads/2026/04/rain.png',
  fuel: 'https://www.inp.net.pk/images/20240423125921_ogImage_1.jpg',
  balochistan: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Winding_road_in_Balochistan_%28Pakistan%29_%283964474957%29.jpg'
};

function addFallbackImages(posts) {
  return (Array.isArray(posts) ? posts : []).map(post => {
    if (post.image_url) return post;
    const text = `${post.title_en || ''} ${post.title_ur || ''} ${post.category || ''}`.toLowerCase();
    let image_url = FALLBACK_IMAGES.sport;
    if (/rain|weather|monsoon|بارش|موسم/.test(text)) image_url = FALLBACK_IMAGES.rain;
    else if (/petrol|diesel|fuel|oil|business|پٹرول|ڈیزل/.test(text)) image_url = FALLBACK_IMAGES.fuel;
    else if (/balochistan|بلوچستان/.test(text)) image_url = FALLBACK_IMAGES.balochistan;
    return { ...post, image_url };
  });
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed.' }, 405);

  try {
    const today = karachiDate();
    const hasExplicitDate = Boolean(req.query?.date);
    const requestedDate = String(req.query?.date || today);
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : today;
    const select = 'id,category,title_en,title_ur,excerpt_en,excerpt_ur,image_url,source_name,source_url,published_on,daily_rank,updated_at';

    let r = await supabaseFetch(
      `news_posts?published_on=eq.${encodeURIComponent(targetDate)}&is_published=eq.true&select=${select}&order=daily_rank.asc&limit=5`
    );
    let data = await dbJson(r);
    if (!r.ok) return json(res, { error: 'News is temporarily unavailable.' }, 503);

    let effectiveDate = targetDate;
    if (!Array.isArray(data) || data.length === 0) {
      if (hasExplicitDate) {
        data = [];
      } else {
        r = await supabaseFetch(
          `news_posts?is_published=eq.true&select=${select}&order=published_on.desc,daily_rank.asc&limit=5`
        );
        data = await dbJson(r);
        if (!r.ok) return json(res, { error: 'News is temporarily unavailable.' }, 503);
        effectiveDate = Array.isArray(data) && data[0]?.published_on ? data[0].published_on : targetDate;
      }
    }

    const datesResponse = await supabaseFetch(
      'news_posts?is_published=eq.true&select=published_on&order=published_on.desc&limit=1000'
    );
    const dateRows = await dbJson(datesResponse);
    const availableDates = Array.isArray(dateRows)
      ? [...new Set(dateRows.map(x => x.published_on).filter(Boolean))]
      : [];

    return json(res, {
      posts: addFallbackImages(data),
      date: effectiveDate,
      requestedDate: targetDate,
      isLatestAvailable: effectiveDate !== targetDate,
      availableDates,
      language: req.query?.lang === 'ur' ? 'ur' : 'en'
    });
  } catch (e) {
    return json(res, { error: e.message || 'News request failed.' }, 500);
  }
};
