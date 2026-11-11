const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');
const { syncPopularNews } = require('../lib/popular-news');

const LIVE_IMAGES = {
  cricket: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=82',
  tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=82',
  fuel: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=1200&q=82',
  finance: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=82',
  flood: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=82',
  housing: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=82',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=82',
  telecom: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=82',
  automotive: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=82',
  food: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=82',
  diplomacy: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=82',
  airport: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=82',
  shipping: 'https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1200&q=82',
  energy: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=82',
  security: 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=1200&q=82',
  city: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=82',
  person: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=82',
  fallback: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=82'
};

const NEWS_RATE_WINDOW_MS = 60 * 1000;
const NEWS_RATE_LIMIT = 60;
const newsRate = global.__pnwNewsRate || (global.__pnwNewsRate = new Map());
function newsClientIp(req) { const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'); }

function pickLiveImage(post) {
  const text = `${post.title_en || ''} ${post.title_ur || ''} ${post.excerpt_en || ''} ${post.category || ''}`.toLowerCase();
  if (/apni chhat|apna ghar|housing|house|home|housing project|گھر|مکان/.test(text)) return LIVE_IMAGES.housing;
  if (/ufone|onic|telecom|5g|sim|e?sim|mobile network|ptcl|یوفون|اونک|ٹیلی کام|موبائل/.test(text)) return LIVE_IMAGES.telecom;
  if (/car sales|cars|automotive|vehicle|vehicles|auto policy|گاڑی|آٹو/.test(text)) return LIVE_IMAGES.automotive;
  if (/sugar|wheat|food security|agriculture|چینی|گندم|زراعت|خوراک/.test(text)) return LIVE_IMAGES.food;
  if (/public firms|state-owned|soes|profit-making|loss-making|سرکاری ادارے|منافع|خسارہ/.test(text)) return LIVE_IMAGES.finance;
  if (/psx|stock market|shares|investor|trading|kse|remittance|ترسیلات|اسٹاک|سرمایہ کار|شیئر/.test(text)) return LIVE_IMAGES.finance;
  if (/exchange facility|exchange line|swap facility|currency facility|central bank facility|10bn|\$10bn|\$10 billion|10 billion/.test(text)) return LIVE_IMAGES.finance;
  if (/petrol|diesel|fuel|oil price|fuel price|gasoline|پٹرول|ڈیزل|تیل|ایندھن/.test(text)) return LIVE_IMAGES.fuel;
  if (/flood|rain|rainfall|ndma|monsoon|flood-hit|flood risk|بارش|سیلاب|مون سون|این ڈی ایم اے/.test(text)) return LIVE_IMAGES.flood;
  if (/naval|navy|warship|ship collision|vessel collision|maritime|shipping|hormuz|commercial vessel|بحری جہاز|بحری|جہاز|آبنائے ہرمز/.test(text)) return LIVE_IMAGES.shipping;
  if (/airport|aviation|flight|airline|drone|amritsar|پرواز|ایئرپورٹ|ہوائی اڈ/.test(text)) return LIVE_IMAGES.airport;
  if (/cricket|test match|england.*pakistan|pakistan.*england|pcb|player conduct|over-rate|world test championship|asian games|کرکٹ|ٹیسٹ|پی سی بی|ایشیائی کھیل/.test(text)) return LIVE_IMAGES.cricket;
  if (/alcaraz|sabalenka|zverev|us open|tennis|الکاراز|سبالینکا|زویریو|ٹینس/.test(text)) return LIVE_IMAGES.tennis;
  if (/technology|openai|gpt|anthropic|artificial intelligence|ai development|cybersecurity|ٹیکنالوجی|اے آئی|مصنوعی ذہانت/.test(text)) return LIVE_IMAGES.technology;
  if (/remittances|economy|business|market|oil prices|opec|pipeline|energy|lng|electricity|nepra|توانائی|معیشت|کاروبار|بجلی/.test(text)) return LIVE_IMAGES.energy;
  if (/diplomacy|diplomatic|un general assembly|united nations|mecca pact|pact|peace talks|sanctions|foreign minister|foreign affairs|سفارتی|اقوام متحدہ|معاہدہ|امن مذاکرات|پابندیاں/.test(text)) return LIVE_IMAGES.diplomacy;
  if (/security|terror|militant|attack|section 144|balochistan|insurgent|police|terrorism|دہشت|شدت پسند|حملہ|سکیورٹی|بلوچستان|پولیس|دفعہ 144/.test(text)) return LIVE_IMAGES.security;
  if (/gloria steinem|dies at|death|obituary|انتقال|وفات/.test(text)) return LIVE_IMAGES.person;
  if (/bridge|road bridge|gwadar|sohar|city|pakistan|islamabad|lahore|karachi|weather|پُل|گوادر|صحار|پاکستان|اسلام آباد|لاہور|کراچی/.test(text)) return LIVE_IMAGES.city;
  return LIVE_IMAGES.fallback;
}

function normalizeImages(posts) {
  return (Array.isArray(posts) ? posts : []).map(post => {
    const storedImage = String(post.image_url || '').trim();
    const isGeneratedImage = /^\/api\/news-image(?:\?|$)/.test(storedImage);
    const isHttpsImage = /^https:\/\//i.test(storedImage);
    return {
      ...post,
      image_url: isHttpsImage && !isGeneratedImage ? storedImage : pickLiveImage(post)
    };
  });
}


function popularShiftDate(date, days) {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function popularTraffic(value) {
  const text = String(value || '').toUpperCase();
  const number = Number.parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(number) ? number * (text.includes('M') ? 1000000 : text.includes('K') ? 1000 : 1) : 0;
}
function popularNormalize(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function aggregatePopularNews(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = popularNormalize(row.google_query);
    if (!key) continue;
    const item = groups.get(key) || { ...row, countries: new Set(), trend_count: 0, rank_score: 0, traffic_score: 0, latest_date: row.trend_date };
    item.countries.add(row.country);
    item.trend_count += 1;
    item.rank_score += Math.max(1, 6 - Number(row.daily_rank || 5));
    item.traffic_score += popularTraffic(row.approx_traffic);
    if (row.trend_date > item.latest_date) Object.assign(item, {
      latest_date: row.trend_date, title_en: row.title_en, title_ur: row.title_ur,
      excerpt_en: row.excerpt_en, excerpt_ur: row.excerpt_ur, category: row.category,
      source_name: row.source_name, source_url: row.source_url, image_url: row.image_url, country: row.country
    });
    groups.set(key, item);
  }
  return [...groups.values()].map(item => ({ ...item, countries: [...item.countries] }))
    .sort((a, b) => b.trend_count - a.trend_count || b.rank_score - a.rank_score || b.traffic_score - a.traffic_score)
    .slice(0, 5);
}
async function servePopularNews(req, res) {
  const window = String(req.query?.window || '24h');
  if (!['24h', '7d'].includes(window)) return json(res, { error: 'Use window=24h or window=7d.' }, 400);
  try {
    const today = karachiDate(), start = popularShiftDate(today, -6);
    const response = await supabaseFetch('popular_news?is_published=eq.true&trend_date=gte.' + encodeURIComponent(start) +
      '&select=trend_date,country,google_query,approx_traffic,category,title_en,title_ur,excerpt_en,excerpt_ur,source_name,source_url,image_url,daily_rank,created_at,updated_at&order=trend_date.desc,daily_rank.asc&limit=100');
    const rows = await dbJson(response);
    if (!response.ok) return json(res, { error: 'Popular news is temporarily unavailable.' }, 503);
    const records = Array.isArray(rows) ? rows : [];
    if (!records.length) return json(res, { window, stories: [], updated_at: null, date: null });
    const latest = records[0].trend_date;
    const stories = window === '24h'
      ? records.filter(row => row.trend_date === latest).sort((a, b) => Number(a.daily_rank) - Number(b.daily_rank))
        .slice(0, 5).map(row => ({ ...row, countries: [row.country], trend_count: 1 }))
      : aggregatePopularNews(records);
    const timestamp = records.reduce((max, row) => Math.max(max, Date.parse(row.updated_at || row.created_at || '') || 0), 0);
    return json(res, { window, stories, date: latest, updated_at: timestamp ? new Date(timestamp).toISOString() : null,
      range_start: window === '7d' ? start : latest, range_end: latest });
  } catch (error) {
    return json(res, { error: error.message || 'Popular news request failed.' }, 500);
  }
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed.' }, 405);
  if (String(req.query?.refreshPopular || '') === '1') {
    const authorization = req.headers.authorization || '';
    if (!process.env.CRON_SECRET || authorization !== 'Bearer ' + process.env.CRON_SECRET) return json(res, { error: 'Unauthorized.' }, 401);
    try {
      const result = await syncPopularNews(karachiDate());
      return json(res, { ok: true, ...result });
    } catch (error) {
      console.error(JSON.stringify({ event: 'popular-news-update', status: 'failed', message: error?.message || String(error) }));
      return json(res, { ok: false, error: error?.message || 'Popular news update failed.' }, 500);
    }
  }

  const now = Date.now(), ip = newsClientIp(req), previous = newsRate.get(ip);
  if (!previous || now - previous.startedAt >= NEWS_RATE_WINDOW_MS) newsRate.set(ip, { startedAt: now, count: 1 });
  else { previous.count += 1; if (previous.count > NEWS_RATE_LIMIT) { res.setHeader('Retry-After','60'); return json(res, { error:'Too many news requests. Please try again in a minute.' }, 429); } }
  if (req.query?.lang && !['en','ur'].includes(String(req.query.lang))) return json(res, { error:'Unsupported language. Use lang=en or lang=ur.' }, 400);
  if (String(req.query?.popular || '') === '1') return servePopularNews(req, res);
  try {
    const today = karachiDate();
    const hasExplicitDate = Boolean(req.query?.date);
    const requestedDate = String(req.query?.date || today);
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const dateMatch = datePattern.exec(requestedDate);
    if (hasExplicitDate) {
      if (!dateMatch) return json(res, { error: 'Invalid date. Use YYYY-MM-DD.' }, 400);
      const year = Number(dateMatch[1]), month = Number(dateMatch[2]), day = Number(dateMatch[3]);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
        return json(res, { error: 'Invalid calendar date.' }, 400);
      }
    }
    const targetDate = hasExplicitDate ? requestedDate : today;
    if (targetDate > today) return json(res, { error: 'Future editions are not available.' }, 400);
    const datesOptions = {};
    const includeDates = String(req.query?.includeDates ?? '1') !== '0';
    if (String(req.query?.datesOnly || '') === '1') {
      const datesResponse = await supabaseFetch('rpc/get_available_news_dates');
      const dateRows = await dbJson(datesResponse);
      const availableDates = datesResponse.ok && Array.isArray(dateRows)
        ? dateRows.map(row => row?.published_on).filter(Boolean).sort((a, b) => b.localeCompare(a))
        : [];
      return json(res, {posts:[],date:today,requestedDate:today,isLatestAvailable:false,availableDates,language:req.query?.lang==='ur'?'ur':'en'});
    }
    const select = 'id,category,title_en,title_ur,excerpt_en,excerpt_ur,image_url,source_name,source_url,published_on,daily_rank,updated_at';
    let queryDate = targetDate;
    if (!hasExplicitDate) {
      const latestDateResponse = await supabaseFetch('rpc/get_latest_complete_news_date');
      const latestDateRows = await dbJson(latestDateResponse);
      const latestCompleteDate = latestDateResponse.ok && Array.isArray(latestDateRows)
        ? latestDateRows.map(row => row?.published_on).filter(Boolean).sort().at(-1)
        : null;
      if (latestCompleteDate) queryDate = latestCompleteDate;
    }
    let r = await supabaseFetch(`news_posts?published_on=eq.${encodeURIComponent(queryDate)}&is_published=eq.true&select=${select}&order=daily_rank.asc&limit=5`);
    let data = await dbJson(r);
    if (!r.ok) return json(res, { error: 'News is temporarily unavailable.' }, 503);
    if (!Array.isArray(data)) data = [];
    let effectiveDate = queryDate;
    if (!hasExplicitDate && data.length !== 5) {
      const latestDateResponse = await supabaseFetch('rpc/get_latest_complete_news_date');
      const latestDateRows = await dbJson(latestDateResponse);
      const latestCompleteDate = latestDateResponse.ok && Array.isArray(latestDateRows)
        ? latestDateRows.map(row => row?.published_on).filter(Boolean).sort().at(-1)
        : null;
      if (latestCompleteDate && latestCompleteDate !== queryDate) {
        const latestResponse = await supabaseFetch(`news_posts?published_on=eq.${encodeURIComponent(latestCompleteDate)}&is_published=eq.true&select=${select}&order=daily_rank.asc&limit=5`);
        const latestRows = await dbJson(latestResponse);
        if (latestResponse.ok && Array.isArray(latestRows) && latestRows.length === 5) {
          data = latestRows;
          effectiveDate = latestCompleteDate;
        } else data = [];
      } else data = [];
    }
    let availableDates = [];
    if (includeDates) {
      const datesResponse = await supabaseFetch('rpc/get_available_news_dates', datesOptions);
      const dateRows = await dbJson(datesResponse);
      if (datesResponse.ok && Array.isArray(dateRows)) {
        availableDates = dateRows.map(row => row?.published_on).filter(Boolean).sort((a, b) => b.localeCompare(a));
      }
    }
    return json(res, {posts:normalizeImages(data),date:effectiveDate,requestedDate:targetDate,isLatestAvailable:effectiveDate!==targetDate,availableDates,language:req.query?.lang==='ur'?'ur':'en'});
  } catch (e) {
    return json(res, { error: e.message || 'News request failed.' }, 500);
  }
};