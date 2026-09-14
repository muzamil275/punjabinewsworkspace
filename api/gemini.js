const { json, cors, requireUser, isOwner, supabaseFetch, dbJson, safeText, karachiDate } = require('../lib/api');
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const REQUEST_TIMEOUT_MS = 20000;
const MAX_HISTORY = 12;
const MAX_HISTORY_CHARS = 24000;

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  let total = 0;
  const out = [];
  for (const item of value.slice(-MAX_HISTORY)) {
    const role = item?.role === 'model' ? 'model' : 'user';
    const text = safeText(item?.text, 4000).trim();
    if (!text) continue;
    if (total + text.length > MAX_HISTORY_CHARS) break;
    out.push({ role, parts: [{ text }] });
    total += text.length;
  }
  return out;
}

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
    const prompt = safeText(body.prompt, 5000).trim();
    if (!prompt) return json(res, { error: 'Enter a prompt first.' }, 422);
    const history = normalizeHistory(body.history);
    const today = karachiDate();
    const select = 'category,title_en,title_ur,excerpt_en,excerpt_ur,source_name,source_url,daily_rank,published_on';
    let effectiveDate = today;
    let context = '';
    let news = await supabaseFetch(`news_posts?published_on=eq.${encodeURIComponent(today)}&is_published=eq.true&select=${select}&order=daily_rank.asc&limit=5`, { authHeader: req.headers.authorization || '' });
    let rows = news.ok ? await dbJson(news) : [];
    if (!Array.isArray(rows) || !rows.length) {
      news = await supabaseFetch(`news_posts?is_published=eq.true&select=${select}&order=published_on.desc,daily_rank.asc&limit=5`, { authHeader: req.headers.authorization || '' });
      rows = news.ok ? await dbJson(news) : [];
      if (Array.isArray(rows) && rows.length && rows[0]?.published_on) effectiveDate = rows[0].published_on;
    }
    if (Array.isArray(rows) && rows.length) context = rows.map((p,i)=>`${i+1}. [${p.category||'News'}] ${p.title_en||''} - ${p.excerpt_en||''}${p.source_name?` (Workspace source: ${p.source_name})`:''}`).join('\n');
    const instruction = `You are the AI assistant inside Punjabi News Workspace. Answer the user directly and naturally, using the same language and writing style the user uses. This is a strict language-mirroring requirement: if the user writes English, answer in English; if the user writes Urdu script, answer in Urdu script; if the user writes Roman Urdu or Roman Punjabi, answer in the same Roman Urdu/Roman Punjabi style; if the user changes language, follow the new language. Do NOT default to Hindi and do not convert Pakistani Urdu/Roman Urdu into Hindi unless the user explicitly asks for Hindi. Preserve the language/style of the ongoing conversation when the current request depends on earlier turns. Keep answers concise and direct. IMPORTANT: Always use Google Search before answering. Do not answer factual or current-information questions from model memory alone. Search the web first, prefer current and reputable sources, and base factual claims on the search results. The workspace news below is context only and is never a substitute for web search. For today's/current news, verify it with Google Search before responding. Do not invent breaking news, sources, or facts.\n\nPakistan date (Asia/Karachi): ${today}\nLatest published workspace edition: ${effectiveDate}\nWorkspace news context:\n${context || '(No published workspace news found.)'}\n\nCurrent user request:\n${prompt}`;
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:'Always search the web first for factual answers. Follow the user language exactly and keep responses concise. Never switch to Hindi unless explicitly requested.'}]},
          contents:[...history,{role:'user',parts:[{text:instruction}]}],
          tools:[{google_search:{}}],
          generationConfig:{thinkingConfig:{thinkingLevel:'low',includeThoughts:false}}
        }),
        signal:controller.signal
      });
    } catch(error) {
      if(error?.name==='AbortError') return json(res,{error:'Gemini took too long to respond. Please try again.'},504);
      throw error;
    } finally { clearTimeout(timeout); }
    const data=await response.json().catch(()=>({}));
    if(!response.ok){console.error('Gemini API error',response.status,data?.error?.message||'unknown');return json(res,{error:'Gemini could not complete the request. Please try again.'},response.status>=400&&response.status<500?502:503);}
    const text=Array.isArray(data?.candidates?.[0]?.content?.parts)?data.candidates[0].content.parts.map(part=>part?.text||'').join('').trim():'';
    if(!text)return json(res,{error:'Gemini returned an empty response.'},502);
    const chunks=Array.isArray(data?.candidates?.[0]?.groundingMetadata?.groundingChunks)?data.candidates[0].groundingMetadata.groundingChunks:[];
    const sources=[];
    for(const chunk of chunks){const uri=chunk?.web?.uri,title=chunk?.web?.title;if(uri&&title&&!sources.some(s=>s.url===uri))sources.push({title,url:uri});}
    return json(res,{model:MODEL,text,newsDate:effectiveDate,sources:sources.slice(0,6)},200);
  } catch(e){ console.error('Gemini route error',e); return json(res,{error:'Gemini request failed.'},500); }
};
