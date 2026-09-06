(()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
  const premiumMap={
    'PREMIUM WORKSPACE':'پریمیم ورک اسپیس',
    'A richer reading experience.':'ایک مزید بہتر مطالعے کا تجربہ۔',
    'Manage Premium':'پریمیم منظم کریں',
    'Deep brief':'تفصیلی بریف',
    'Source context':'ماخذ کی تفصیل',
    'Priority layout':'ترجیحی لے آؤٹ',
    'PREMIUM PREVIEW':'پریمیم پیش نظارہ',
    'Basic stays simple. Premium goes further.':'بنیادی موڈ سادہ رہتا ہے۔ پریمیم مزید آگے جاتا ہے۔',
    'Premium is available separately for readers who want the enhanced experience.':'بہتر تجربہ چاہنے والے قارئین کے لیے پریمیم الگ سے دستیاب ہے۔',
    'View Premium Preview':'پریمیم پیش نظارہ دیکھیں',
    'Premium mode is separate from Basic mode and requires active access.':'پریمیم موڈ بنیادی موڈ سے الگ ہے اور فعال رسائی درکار ہے۔',
    'Premium access is active.':'پریمیم رسائی فعال ہے۔',
    'Premium access':'پریمیم رسائی',
    'Unlock the full workspace.':'مکمل ورک اسپیس کھولیں۔',
    'Basic keeps the briefing focused. Premium adds a richer reading mode built for deeper daily news use.':'بنیادی موڈ بریفنگ کو مختصر اور مرکوز رکھتا ہے۔ پریمیم روزانہ خبروں کے لیے مزید گہرائی والا مطالعہ موڈ فراہم کرتا ہے۔',
    'Unlock Premium':'پریمیم کھولیں',
    'Premium mode':'پریمیم موڈ'
  };
  function isUrdu(){return document.documentElement.lang==='ur'}
  function localizePremium(){
    document.querySelectorAll('#premiumMode .eyebrow,#premiumMode h2,#premiumMode h3,#premiumMode .muted,#premiumMode .premium-toolbar span,#premiumMode button,#premium-anchor .eyebrow,#premium-anchor h2,#premium-anchor .muted,#premium-anchor button').forEach(el=>{
      const current=el.textContent.trim();
      const original=el.dataset.premiumEn||current;
      el.dataset.premiumEn=original;
      el.textContent=isUrdu()?(premiumMap[original]||original):original;
    });
    wrapWords();
  }
  function wrapWords(){
    document.querySelectorAll('#premiumMode h1,#premiumMode h2,#premiumMode h3,#premium-anchor h2').forEach(el=>{
      const text=el.textContent.trim();
      if(!text)return;
      el.dataset.wordsWrapped='1';
      el.innerHTML=text.split(/(\s+)/).map(part=>/\s+/.test(part)?part:`<span class="premium-word">${esc(part)}</span>`).join('');
    });
  }
  function retrigger(el,cls='premium-enter-motion',duration=3700){
    if(!el)return;
    el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);
    clearTimeout(window[`__${cls}Timer`]);
    window[`__${cls}Timer`]=setTimeout(()=>el.classList.remove(cls),duration);
  }
  function triggerPremium(){localizePremium();retrigger(document.querySelector('#premiumMode'),'premium-enter-motion',3900)}
  function triggerPreview(){localizePremium();retrigger(document.querySelector('#premium-anchor'),'premium-preview-enter-motion',3600)}
  const observer=new MutationObserver(m=>{
    let mode=false,language=false,content=false;
    for(const x of m){if(x.type==='attributes'&&x.attributeName==='data-mode')mode=true;if(x.type==='attributes'&&x.attributeName==='lang')language=true;if(x.type==='childList')content=true}
    if(mode&&document.body.dataset.mode==='premium')triggerPremium();
    if(language||content)setTimeout(localizePremium,0);
  });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  observer.observe(document.body,{attributes:true,attributeFilter:['data-mode'],childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const preview=e.target.closest?.('#premium-anchor button[data-mode="premium"]');
    if(preview){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();triggerPreview();preview.blur();return}
    const nav=e.target.closest?.('a[href="#premium-anchor"]');
    if(nav)setTimeout(triggerPreview,40);
    const premium=e.target.closest?.('.mode-pill[data-mode="premium"]');
    if(premium){document.body.classList.remove('premium-preview-only');setTimeout(triggerPremium,30)}
    const account=e.target.closest?.('#accountButton');
    if(account)setTimeout(()=>{if(document.body.dataset.mode==='premium')triggerPremium()},40);
    const language=e.target.closest?.('#languageToggle');
    if(language)setTimeout(localizePremium,40);
  },true);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(localizePremium,0)):setTimeout(localizePremium,0);
})();
