(()=>{
  'use strict';
  const root=document.documentElement;
  function wrapWords(){document.querySelectorAll('#premiumMode h1,#premiumMode h2,#premiumMode h3').forEach(el=>{if(el.dataset.wordsWrapped==='1')return;const text=el.textContent.trim();if(!text)return;el.dataset.wordsWrapped='1';el.innerHTML=text.split(/(\s+)/).map(part=>/\s+/.test(part)?part:`<span class="premium-word">${part.replace(/[&<>\"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]))}</span>`).join('')})}
  function trigger(){const premium=document.querySelector('#premiumMode');if(!premium)return;wrapWords();premium.classList.remove('premium-enter-motion');void premium.offsetWidth;premium.classList.add('premium-enter-motion');clearTimeout(window.__premiumMotionTimer);window.__premiumMotionTimer=setTimeout(()=>premium.classList.remove('premium-enter-motion'),3600)}
  const observer=new MutationObserver(m=>{for(const x of m)if(x.type==='attributes'&&x.attributeName==='data-mode'&&document.body.dataset.mode==='premium'){trigger();break}});
  observer.observe(document.body,{attributes:true});
  document.addEventListener('click',e=>{const b=e.target.closest?.('.mode-pill[data-mode="premium"]');if(b)setTimeout(()=>trigger(),20);const a=e.target.closest?.('#accountButton');if(a)setTimeout(()=>{if(document.body.dataset.mode==='premium')trigger()},30)},true);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',wrapWords):wrapWords();
})();
