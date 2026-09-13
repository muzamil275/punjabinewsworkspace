const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');

const LOCAL_IMAGES = {
  fallback: '/news-images/fallback.svg',
  sport: '/news-images/cricket.svg',
  rain: '/news-images/fallback.svg',
  fuel: '/news-images/fuel-prices-20260910.svg',
  oil: '/news-images/oil-prices-20260911.svg',
  balochistan: '/news-images/balochistan-security-20260909.svg',
  airport: '/news-images/airport.svg',
  aviation: '/news-images/airport.svg',
  iran: '/news-images/iran-gulf.svg',
  gulf: '/news-images/iran-gulf.svg',
  shipping: '/news-images/hormuz-shipping-20260911.svg',
  gwadar: '/news-images/gwadar-sohar-20260908.svg',
  paf: '/news-images/paf-day-20260907.svg',
  england: '/news-images/england-pakistan-20260912.svg',
  cricket: '/news-images/cricket.svg'
};

function pickLocalImage(post) {
  const text = `${post.title_en || ''} ${post.title_ur || ''} ${post.excerpt_en || ''} ${post.category || ''}`.toLowerCase();
  if (/balochistan|بلوچستان/.test(text)) return LOCAL_IMAGES.balochistan;
  if (/rain|weather|monsoon|بارش|موسم/.test(text)) return LOCAL_IMAGES.rain;
  if (/petrol|diesel|fuel|oil prices|پٹرول|ڈیزل|تیل/.test(text)) return /oil prices|تیل/.test(text) ? LOCAL_IMAGES.oil : LOCAL_IMAGES.fuel;
  if (/hormuz|shipping|ship|maritime|بحری|شپنگ/.test(text)) return LOCAL_IMAGES.shipping;
  if (/gwadar|sohar|گوادر/.test(text)) return LOCAL_IMAGES.gwadar;
  if (/iran|gulf|ایران|خلیج/.test(text)) return LOCAL_IMAGES.iran;
  if (/airport|aviation|flight|airline|ہوائی اڈ|پرواز/.test(text)) return LOCAL_IMAGES.airport;
  if (/paf|air force|فضائیہ/.test(text)) return LOCAL_IMAGES.paf;
  if (/england|pakistan.*test|پاکستان.*انگلینڈ/.test(text)) return LOCAL_IMAGES.england;
  if (/sport|cricket|match|کھیل|کرکٹ|میچ/.test(text)) return LOCAL_IMAGES.cricket;
  return LOCAL_IMAGES.fallback;
}

function normalizeImages(posts) {
  return (Array.isArray(posts) ? posts : []).map(post => ({
    ...post,
    image_url: typeof post.image_url === 'string' && post.image_url.startsWith('/')
      ? post.image_url
      : pickLocalImage(post)
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
