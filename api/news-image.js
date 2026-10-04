const { json, supabaseFetch, dbJson } = require('../lib/api');

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function sceneFor(text) {
  const t = text.toLowerCase();
  if (/e-passport|passport|پاسپورٹ/.test(t)) return 'passport';
  if (/imf|budget|economy|remittance|psx|stock|finance|profit|forecast|dollar|billion|rs\b/.test(t)) return 'finance';
  if (/tractor|farmer|wheat|agriculture|sugar|kissan|زراعت|گندم|کسان|ٹریکٹر|چینی/.test(t)) return 'agriculture';
  if (/rain|flood|monsoon|weather|ndma|بارش|سیلاب|مون سون|موسم/.test(t)) return 'weather';
  if (/polio|health|medical|hospital|vaccin|health worker|پولیو|صحت|ویکس/.test(t)) return 'health';
  if (/cricket|test match|hockey|kabaddi|squash|us open|tennis|alcaraz|zverev|player|sports|کھیل|کرکٹ|ہاکی/.test(t)) return 'sports';
  if (/(?:\\bai\\b|artificial intelligence|openai|gpt|cyberattack|cybersecurity|technology|\\btech\\b|گوگل|مصنوعی ذہانت|ٹیکنالوجی)/.test(t)) return 'technology';
  if (/airport|flight|airline|drone|aviation|ایئرپورٹ|پرواز|ڈرون/.test(t)) return 'aviation';
  if (/ship|shipping|hormuz|naval|vessel|maritime|port|جہاز|آبنائے|بندرگاہ/.test(t)) return 'shipping';
  if (/oil|petrol|diesel|fuel|energy|lng|refinery|pipeline|nepra|electricity|توانائی|پٹرول|ڈیزل|بجلی|ریفائنری/.test(t)) return 'energy';
  if (/diplomacy|diplomatic|unga|united nations|foreign|sco|mecca pact|saudi|iran|india|china|russia|ukraine|sanction|معاہدہ|سفارت|اقوام متحدہ|ایران|سعودی|بھارت|چین/.test(t)) return 'diplomacy';
  if (/section 144|protest|march|rally|pti|arrest|police|rangers|politics|political|اسلام آباد مارچ|احتجاج|گرفتار|پولیس|سیکشن 144/.test(t)) return 'civic';
  if (/terror|militant|attack|security|army|ispr|insurgent|compound|balochistan|hangu|kohat|waziristan|دہشت|حملہ|سکیورٹی|فوج|بلوچستان/.test(t)) return 'security';
  if (/bridge|road|transport|city|lahore|karachi|islamabad|turbat|gwadar|bridge|پُل|سڑک|شہر/.test(t)) return 'infrastructure';
  return 'news';
}
function wrapTitle(title, max = 34) {
  const words = String(title || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (next.length > max && line) { lines.push(line); line = word; } else line = next;
    if (lines.length === 2) break;
  }
  if (line && lines.length < 3) lines.push(line);
  if (words.join(' ').length > lines.join(' ').length) lines[lines.length - 1] = lines[lines.length - 1].slice(0, max - 1) + '…';
  return lines;
}
function icon(scene, accent) {
  const stroke = '#f7fafc', muted = '#b8c6d9';
  const sw = 7;
  const common = `fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  const a = `fill="${accent}"`;
  switch(scene) {
    case 'passport': return `<rect x="230" y="105" width="300" height="390" rx="24" fill="${accent}" opacity=".95"/><rect x="255" y="135" width="250" height="330" rx="16" fill="#0b1020" opacity=".75"/><circle cx="380" cy="242" r="54" ${common}/><path d="M300 390h160" ${common}/><path d="M310 300h140" ${common}/><path d="M330 345h100" ${common}/>`;
    case 'finance': return `<rect x="190" y="355" width="70" height="115" rx="8" ${a}/><rect x="290" y="295" width="70" height="175" rx="8" ${a}/><rect x="390" y="225" width="70" height="245" rx="8" ${a}/><path d="M180 215l95 55 95-90 110 55" ${common}/><path d="M480 235l8-52-52 8" ${common}/><circle cx="225" cy="145" r="34" fill="#f2c94c"/><path d="M225 124v42m-16-11h24c14 0 18 20 0 20h-18c-18 0-14 21 0 21h28" ${common} stroke="${muted}"/>`;
    case 'agriculture': return `<path d="M120 430 Q360 275 600 430 V520 H120Z" fill="${accent}" opacity=".7"/><path d="M175 425 Q360 315 545 425" ${common} stroke="${muted}"/><rect x="235" y="285" width="185" height="105" rx="22" fill="${accent}"/><rect x="390" y="330" width="105" height="60" rx="15" fill="${accent}"/><circle cx="275" cy="408" r="42" ${a}/><circle cx="450" cy="408" r="32" ${a}/><path d="M455 390h90l35 70" ${common}/><path d="M510 460h55" ${common}/>`;
    case 'weather': return `<path d="M175 280c0-58 46-104 104-104 47 0 88 31 100 74 9-5 20-8 31-8 39 0 70 31 70 70 0 3 0 7-1 10H205c-17-8-30-24-30-42z" fill="${accent}" opacity=".9"/><path d="M255 355l-15 82m75-82l-15 82m75-82l-15 82m75-82l-15 82" ${common} stroke="${muted}"/><path d="M155 465h390" ${common}/>`;
    case 'health': return `<rect x="215" y="155" width="330" height="330" rx="38" fill="${accent}" opacity=".88"/><path d="M380 220v200M280 320h200" ${common}/><circle cx="380" cy="320" r="118" fill="none" stroke="${muted}" stroke-width="5"/><path d="M245 455h270" ${common}/>`;
    case 'sports': return `<rect x="165" y="165" width="430" height="290" rx="26" fill="${accent}" opacity=".65"/><circle cx="470" cy="270" r="38" fill="#fff"/><path d="M210 390h340" ${common}/><path d="M240 390V250h12m236 140V250h-12" ${common} stroke="${muted}"/><circle cx="380" cy="330" r="34" fill="none" stroke="#fff" stroke-width="7"/>`;
    case 'technology': return `<rect x="195" y="140" width="370" height="300" rx="28" fill="${accent}" opacity=".9"/><rect x="235" y="180" width="290" height="220" rx="16" fill="#0b1020"/><path d="M280 285h55l28-55 45 100 30-55h45" ${common}/><path d="M265 475h230" ${common}/><path d="M225 195h-55m55 55h-55m55 55h-55m390-110h55m-55 55h55m-55 55h55" ${common} stroke="${muted}"/>`;
    case 'aviation': return `<path d="M160 340l185-40 200-95c28-13 51 21 27 40l-173 111 65 77c10 12-3 29-18 23l-115-47-78 53c-15 10-33-5-26-21l32-72-117-10c-20-2-21-28-2-32z" fill="${accent}"/><circle cx="520" cy="260" r="12" fill="#fff"/>`;
    case 'shipping': return `<path d="M145 340h470l-44 112H190z" fill="${accent}" opacity=".9"/><path d="M205 340V230h290v110" ${common}/><path d="M260 230v-60h180v60" ${common}/><path d="M120 470c55 28 110 28 165 0 55 28 110 28 165 0 55 28 110 28 165 0" ${common} stroke="${muted}"/>`;
    case 'energy': return `<rect x="205" y="180" width="165" height="250" rx="26" fill="${accent}"/><rect x="390" y="180" width="165" height="250" rx="26" fill="#2a3550"/><path d="M288 225v70m-38-35h76m123-35v70m-38-35h76" ${common}/><path d="M205 455h350" ${common}/>`;
    case 'diplomacy': return `<circle cx="380" cy="305" r="140" fill="${accent}" opacity=".85"/><path d="M240 305h280M380 165v280" ${common}/><path d="M315 178c-34 39-52 80-52 127s18 88 52 127m130-254c34 39 52 80 52 127s-18 88-52 127" ${common} stroke="${muted}"/><path d="M185 500h390" ${common}/>`;
    case 'civic': return `<circle cx="275" cy="255" r="34" fill="${accent}"/><circle cx="390" cy="225" r="34" fill="${accent}"/><circle cx="500" cy="255" r="34" fill="${accent}"/><path d="M225 425l50-105 50 105m15-25l50-105 50 105m-15 25l50-105 50 105" fill="none" stroke="${accent}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><rect x="300" y="350" width="160" height="65" rx="10" fill="#0b1020" stroke="${muted}" stroke-width="5"/>`;
    case 'security': return `<path d="M380 145l150 60v120c0 105-63 167-150 205-87-38-150-100-150-205V205z" fill="${accent}" opacity=".9"/><path d="M315 320l42 42 88-96" ${common}/><path d="M185 490h390" ${common} stroke="${muted}"/>`;
    case 'infrastructure': return `<path d="M135 390h490" ${common}/><path d="M180 390c80-150 150-150 200 0m0 0c50-150 120-150 200 0" fill="none" stroke="${accent}" stroke-width="22"/><rect x="120" y="425" width="520" height="35" rx="10" fill="${muted}" opacity=".75"/>`;
    default: return `<rect x="175" y="155" width="410" height="300" rx="28" fill="${accent}" opacity=".85"/><path d="M235 235h290m-290 70h220m-220 70h170" ${common}/>`;
  }
}
function makeSvg(row) {
  const seed = hash(String(row.id) + row.title_en);
  const accents = ['#22c55e','#38bdf8','#f59e0b','#a78bfa','#fb7185'];
  const accent = accents[seed % accents.length];
  const scene = sceneFor(`${row.title_en} ${row.category}`);
  const lines = wrapTitle(row.title_en, 38);
  const titleSvg = lines.map((line, i) => `<text x="58" y="${610 + i * 31}" font-size="24" font-weight="700" fill="#f8fafc">${esc(line)}</text>`).join('');
  const date = esc(row.published_on || '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 760" role="img" aria-label="${esc(row.title_en)}">
<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#0a1020"/><stop offset="100%" stop-color="#18243a"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity=".25"/></filter></defs>
<rect width="760" height="760" rx="34" fill="url(#g)"/>
<circle cx="660" cy="100" r="90" fill="${accent}" opacity=".12"/><circle cx="80" cy="640" r="110" fill="${accent}" opacity=".08"/>
<rect x="38" y="38" width="684" height="26" rx="13" fill="${accent}" opacity=".9"/>
<g filter="url(#s)">${icon(scene, accent)}</g>
<rect x="45" y="575" width="670" height="130" rx="24" fill="#050812" opacity=".9"/>
<text x="58" y="598" font-size="15" font-weight="700" letter-spacing="2" fill="${accent}">PUNJABI NEWS • ${esc(row.category || 'NEWS').toUpperCase()}</text>
${titleSvg}
<text x="58" y="697" font-size="13" fill="#9fb0c7">${date} • Story ${esc(row.daily_rank)}</text>
</svg>`;
}
module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed.' }, 405);
  const id = String(req.query?.id || '');
  if (!/^\d+$/.test(id)) return json(res, { error: 'Invalid story id.' }, 400);
  try {
    const r = await supabaseFetch(`news_posts?id=eq.${encodeURIComponent(id)}&is_published=eq.true&select=id,title_en,category,daily_rank,published_on&limit=1`);
    const rows = await dbJson(r);
    if (!r.ok || !Array.isArray(rows) || !rows[0]) return json(res, { error: 'Story not found.' }, 404);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.end(makeSvg(rows[0]));
  } catch (error) {
    return json(res, { error: error.message || 'Image generation failed.' }, 500);
  }
};