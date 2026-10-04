const { json, cors, supabaseFetch, dbJson, karachiDate } = require('../lib/api');

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

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed.' }, 405);
  const now = Date.now(), ip = newsClientIp(req), previous = newsRate.get(ip);
  if (!previous || now - previous.startedAt >= NEWS_RATE_WINDOW_MS) newsRate.set(ip, { startedAt: now, count: 1 });
  else { previous.count += 1; if (previous.count > NEWS_RATE_LIMIT) { res.setHeader('Retry-After','60'); return json(res, { error:'Too many news requests. Please try again in a minute.' }, 429); } }
  if (req.query?.lang && !['en','ur'].includes(String(req.query.lang))) return json(res, { error:'Unsupported language. Use lang=en or lang=ur.' }, 400);
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
    const select = 'id,category,title_en,title_ur,excerpt_en,excerpt_ur,image_url,source_name,source_url,published_on,daily_rank,updated_at';
    let r = await supabaseFetch(`news_posts?published_on=eq.${encodeURIComponent(targetDate)}&is_published=eq.true&select=${select}&order=daily_rank.asc&limit=5`);
    let data = await dbJson(r);
    if (!r.ok) return json(res, { error: 'News is temporarily unavailable.' }, 503);
    if (!Array.isArray(data)) data = [];
    let effectiveDate = targetDate;
    if (!hasExplicitDate && data.length !== 5) {
      const latestDatesResponse = await supabaseFetch('news_posts?is_published=eq.true&select=published_on,daily_rank&order=published_on.desc&limit=1000');
      const latestDateRows = await dbJson(latestDatesResponse);
      const completeDates = new Set();
      if (latestDatesResponse.ok && Array.isArray(latestDateRows)) {
        const ranksByDate = new Map();
        for (const row of latestDateRows) {
          if (!row?.published_on || row.daily_rank == null) continue;
          if (!ranksByDate.has(row.published_on)) ranksByDate.set(row.published_on, new Set());
          ranksByDate.get(row.published_on).add(Number(row.daily_rank));
        }
        for (const [date, ranks] of ranksByDate) if (ranks.size === 5 && [1,2,3,4,5].every(rank => ranks.has(rank))) completeDates.add(date);
      }
      const latestCompleteDate = [...completeDates].sort().at(-1);
      if (latestCompleteDate) {
        const latestResponse = await supabaseFetch(`news_posts?published_on=eq.${encodeURIComponent(latestCompleteDate)}&is_published=eq.true&select=${select}&order=daily_rank.asc&limit=5`);
        const latestRows = await dbJson(latestResponse);
        if (latestResponse.ok && Array.isArray(latestRows) && latestRows.length === 5) {
          data = latestRows;
          effectiveDate = latestCompleteDate;
        } else data = [];
      } else data = [];
    }
    const includeDates = String(req.query?.includeDates ?? '1') !== '0';
    let availableDates = [];
    if (includeDates) {
      const datesResponse = await supabaseFetch('news_posts?is_published=eq.true&select=published_on,daily_rank&order=published_on.desc&limit=1000');
      const dateRows = await dbJson(datesResponse);
      if (Array.isArray(dateRows)) {
        const ranksByDate = new Map();
        for (const row of dateRows) {
          if (!row?.published_on || row.daily_rank == null) continue;
          if (!ranksByDate.has(row.published_on)) ranksByDate.set(row.published_on, new Set());
          ranksByDate.get(row.published_on).add(Number(row.daily_rank));
        }
        availableDates = [...ranksByDate.entries()]
          .filter(([, ranks]) => ranks.size === 5 && [1,2,3,4,5].every(rank => ranks.has(rank)))
          .map(([date]) => date)
          .sort((a, b) => b.localeCompare(a));
      }
    }
    return json(res, {posts:normalizeImages(data),date:effectiveDate,requestedDate:targetDate,isLatestAvailable:effectiveDate!==targetDate,availableDates,language:req.query?.lang==='ur'?'ur':'en'});
  } catch (e) {
    return json(res, { error: e.message || 'News request failed.' }, 500);
  }
};