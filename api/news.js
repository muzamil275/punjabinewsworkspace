const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');

const LIVE_IMAGES = {
  cricket: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=82',
  fuel: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=1200&q=82',
  airport: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=82',
  shipping: 'https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1200&q=82',
  security: 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=1200&q=82',
  city: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=82',
  fallback: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=82'
};

function pickLiveImage(post) {
  const text = `${post.title_en || ''} ${post.title_ur || ''} ${post.excerpt_en || ''} ${post.category || ''}`.toLowerCase();
  if (/balochistan|security|attack|militant|border|بلوچستان|سکیورٹی|حملہ/.test(text)) return LIVE_IMAGES.security;
  if (/petrol|diesel|fuel|oil prices|پٹرول|ڈیزل|تیل/.test(text)) return LIVE_IMAGES.fuel;
  if (/hormuz|shipping|ship|maritime|بحری|شپنگ/.test(text)) return LIVE_IMAGES.shipping;
  if (/airport|aviation|flight|airline|ہوائی اڈ|پرواز/.test(text)) return LIVE_IMAGES.airport;
  if (/sport|cricket|match|کھیل|کرکٹ|میچ|england|pakistan.*test|پاکستان.*انگلینڈ/.test(text)) return LIVE_IMAGES.cricket;
  if (/city|pakistan|islamabad|lahore|karachi|weather|rain|monsoon|پاکستان|اسلام آباد|لاہور|کراچی|بارش|موسم/.test(text)) return LIVE_IMAGES.city;
  return LIVE_IMAGES.fallback;
}

function normalizeImages(posts) {
  return (Array.isArray(posts) ? posts : []).map(post => ({
    ...post,
    image_url: pickLiveImage(post)
  }));
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
      posts: normalizeImages(data),
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