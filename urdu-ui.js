(()=>{'use strict';
const M={
"DAILY NEWS, WITHOUT THE NOISE":"روزانہ کی خبریں، غیر ضروری شور کے بغیر",
"Five stories worth your time.":"پانچ اہم خبریں جو آپ کے وقت کے قابل ہیں۔",
"A focused Punjabi, English, and Urdu daily brief.":"پنجابی، انگریزی اور اردو میں روزانہ کی اہم خبروں کا مختصر خلاصہ۔",
"Go Premium":"پریمیم حاصل کریں",
"First verified payment: 2 months for the price of 1":"پہلی تصدیق شدہ ادائیگی پر ایک کی قیمت میں دو ماہ",
"TODAY":"آج",
"Today's five stories.":"آج کی پانچ اہم خبریں۔",
"Premium Preview":"پریمیم پیش نظارہ",
"PREMIUM PREVIEW":"پریمیم پیش نظارہ",
"Basic stays simple. Premium goes further.":"بنیادی موڈ سادہ ہے، پریمیم میں مزید سہولیات ہیں۔",
"Premium is available separately for readers who want the enhanced experience.":"بہتر تجربہ چاہنے والے قارئین کے لیے پریمیم الگ سے دستیاب ہے۔",
"View Premium Preview":"پریمیم پیش نظارہ دیکھیں",
"OWNER AREA":"مالک کا حصہ",
"Today's five":"آج کی پانچ خبریں",
"Refresh":"تازہ کریں",
"Publish news":"خبر شائع کریں",
"Clear":"صاف کریں",
"Save news":"خبر محفوظ کریں",
"Published cards":"شائع شدہ خبریں",
"Payment verification queue":"ادائیگی کی تصدیق کی فہرست",
"Rank (1–5)":"درجہ (۱ تا ۵)",
"Category":"زمرہ",
"English headline":"انگریزی سرخی",
"English summary":"انگریزی خلاصہ",
"Urdu headline":"اردو سرخی",
"Urdu summary":"اردو خلاصہ",
"Image URL (HTTPS)":"تصویر کا پتا",
"Source name":"ماخذ کا نام",
"Source URL (HTTPS)":"ماخذ کا پتا",
"Support":"مدد",
"Contact support":"مدد کے لیے رابطہ کریں",
"Basic":"بنیادی",
"Premium":"پریمیم",
"Sign in":"سائن اِن",
"Deep brief":"تفصیلی خبرنامہ",
"Source context":"خبر کا پس منظر",
"Priority layout":"ترجیحی ترتیب",
"Manage Premium":"پریمیم کی رکنیت سنبھالیں",
"AI ASSISTANT":"مصنوعی ذہانت کا معاون",
"Ask Gemini about the workspace news.":"خبروں کے مرکز میں شائع شدہ خبروں کے بارے میں جیمنی سے سوال کریں۔",
"Gemini receives the latest published workspace edition from the secure server. Your API key is never sent to the browser.":"جیمنی کو تازہ ترین شائع شدہ خبری ایڈیشن محفوظ سرور سے موصول ہوتا ہے۔ آپ کی اے پی آئی کلید کبھی بھی براؤزر کو نہیں بھیجی جاتی۔",
"New session":"نیا مکالمہ",
"Gemini Activity":"جیمنی کی سرگرمیاں",
"Gemini activity":"جیمنی کی سرگرمیاں",
"Your previous questions and Gemini responses":"آپ کے سابقہ سوالات اور جیمنی کے جوابات",
"Clear activity":"سرگرمیاں صاف کریں",
"Close":"بند کریں",
"Ask for today's news, a summary of a story, or a comparison of the available workspace stories.":"آج کی خبروں، کسی خبر کے خلاصے یا دستیاب خبروں کے تقابل کے بارے میں سوال کریں۔",
"e.g. Give me today's news in five concise points.":"مثلاً آج کی پانچ اہم خبریں مختصر نکات میں بتائیں۔",
"Ask Gemini":"جیمنی سے پوچھیں",
"Sign in with active Premium access to use Gemini.":"جیمنی استعمال کرنے کے لیے فعال پریمیم رسائی کے ساتھ سائن اِن کریں۔",
"Active Premium access is required for Gemini.":"جیمنی استعمال کرنے کے لیے پریمیم رسائی فعال ہونا ضروری ہے۔",
"Gemini is available with active Premium access.":"جیمنی فعال پریمیم رسائی کے ساتھ دستیاب ہے۔",
"Premium access is active.":"پریمیم رسائی فعال ہے۔",
"Premium mode is separate from Basic mode and requires active access.":"پریمیم موڈ بنیادی موڈ سے الگ ہے اور اسے استعمال کرنے کے لیے فعال رسائی ضروری ہے۔",
"A richer reading experience.":"خبریں پڑھنے کا مزید بہتر تجربہ۔",
"PREMIUM WORKSPACE":"پریمیم خبری مرکز",
"Premium mode":"پریمیم موڈ",
"Gemini":"جیمنی",
"You":"آپ",
"Gemini returned an empty response.":"جیمنی کی جانب سے کوئی جواب موصول نہیں ہوا۔",
"Gemini could not complete the request.":"جیمنی آپ کی درخواست مکمل نہیں کر سکا۔",
"Gemini request failed.":"جیمنی سے رابطہ ناکام ہو گیا۔",
"No stories have been published for today yet.":"آج کے لیے ابھی تک کوئی خبر شائع نہیں ہوئی۔",
"Today’s news couldn’t be loaded.":"آج کی خبریں دستیاب نہیں ہو سکیں۔",
"Today’s news could not be loaded.":"آج کی خبریں دستیاب نہیں ہو سکیں۔",
"Please try again.":"براہِ کرم دوبارہ کوشش کریں۔",
"Retry":"دوبارہ کوشش کریں",
"No stories for this edition.":"اس تاریخ کے لیے کوئی خبر موجود نہیں۔",
"Please choose another date from the editions below.":"براہِ کرم نیچے دی گئی تاریخوں میں سے کوئی دوسری تاریخ منتخب کریں۔",
"Edition unavailable":"یہ ایڈیشن دستیاب نہیں",
"Couldn’t load this edition.":"یہ ایڈیشن دستیاب نہیں ہو سکا۔",
"No stories were published for this edition.":"اس ایڈیشن کے لیے کوئی خبر شائع نہیں کی گئی۔",
"Edition unavailable — pick another date.":"یہ ایڈیشن دستیاب نہیں، کوئی دوسری تاریخ منتخب کریں۔",
"Please select a date from 4 September 2026 through today.":"براہِ کرم 4 ستمبر 2026 سے آج تک کی کوئی تاریخ منتخب کریں۔",
"No expiry":"میعاد ختم ہونے کی تاریخ مقرر نہیں",
"Request failed.":"درخواست مکمل نہیں ہو سکی۔",
"National Security":"قومی سلامتی",
"National":"قومی امور",
"Economy":"معیشت",
"Energy":"توانائی",
"Dawn":"ڈان",
"Today":"آج",
"Workspace":"خبری مرکز",
"Languages":"زبانیں",
"Open account or sign in":"اکاؤنٹ کھولیں یا سائن اِن کریں",
"Switch to Basic reading mode":"بنیادی مطالعے کے انداز پر جائیں",
"Switch to Premium mode":"پریمیم موڈ پر جائیں",
"Switch language":"زبان تبدیل کریں",
"Ask Gemini":"جیمنی سے پوچھیں",
"Ask Gemini about today's news":"آج کی خبروں کے بارے میں جیمنی سے سوال کریں",
"Close sign in window":"سائن اِن کی کھڑکی بند کریں"
};
const textStates=new WeakMap(),attrStates=new WeakMap();
const attrs=['placeholder','aria-label','title'];
function updateText(node,ur){
 const el=node.parentElement;
 if(!el||el.closest('script,style,noscript,textarea,input,select,option,code,pre'))return;
 const current=node.nodeValue;
 let state=textStates.get(node);
 if(!state){state={source:current,rendered:null};textStates.set(node,state)}
 else if(state.rendered!==null&&current!==state.rendered)state.source=current;
 const trimmed=state.source.trim(),translated=ur?(M[trimmed]||trimmed):trimmed;
 const leading=(state.source.match(/^\s*/)||[''])[0],trailing=(state.source.match(/\s*$/)||[''])[0];
 const next=leading+translated+trailing;
 if(current!==next)node.nodeValue=next;
 state.rendered=next;
}
function updateAttr(el,name,ur){
 let values=attrStates.get(el);if(!values){values={};attrStates.set(el,values)}
 const current=el.getAttribute(name);if(current===null)return;
 let state=values[name];
 if(!state){state={source:current,rendered:null};values[name]=state}
 else if(state.rendered!==null&&current!==state.rendered)state.source=current;
 const next=ur?(M[state.source]||state.source):state.source;
 if(current!==next)el.setAttribute(name,next);
 state.rendered=next;
}
function scan(root,ur){
 if(!root)return;
 if(root.nodeType===Node.TEXT_NODE){updateText(root,ur);return}
 if(root.nodeType!==Node.ELEMENT_NODE&&root!==document)return;
 if(root.nodeType===Node.ELEMENT_NODE)attrs.forEach(a=>updateAttr(root,a,ur));
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;while((node=walker.nextNode()))updateText(node,ur);
 if(root.querySelectorAll)root.querySelectorAll('*').forEach(el=>attrs.forEach(a=>updateAttr(el,a,ur)));
}
function run(){const ur=document.documentElement.lang==='ur';document.documentElement.dir=ur?'rtl':'ltr';scan(document.body,ur)}
let queued=false;
const observer=new MutationObserver(records=>{
 const ur=document.documentElement.lang==='ur';
 for(const record of records){
  if(record.type==='attributes'){
   if(record.target===document.documentElement&&record.attributeName==='lang'){if(!queued){queued=true;queueMicrotask(()=>{queued=false;run()})}}
   else if(record.target.nodeType===Node.ELEMENT_NODE&&attrs.includes(record.attributeName))updateAttr(record.target,record.attributeName,ur);
  }else if(record.type==='characterData')updateText(record.target,ur);
  else if(record.type==='childList')record.addedNodes.forEach(node=>scan(node,ur));
 }
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang','placeholder','aria-label','title'],childList:true,characterData:true,subtree:true});
})();