(() => {
"use strict";
const root=document.getElementById("popularNewsSection");if(!root)return;
const grid=document.getElementById("popularNewsGrid"),status=document.getElementById("popularNewsStatus"),updated=document.getElementById("popularNewsUpdated"),buttons=[...root.querySelectorAll("[data-popular-window]")];
const state={window:"24h",loading:false,lang:document.documentElement.lang||"en"};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function message(s,k){status.textContent=s;status.dataset.kind=k||""}
function render(data){
 const rows=(data.stories||[]).slice(0,5),ur=state.lang==="ur";
 if(!rows.length){grid.innerHTML='<div class="popular-news-empty"><strong>Popular stories are being prepared</strong><p>Verified Pakistan and India Google search trends will appear here after the daily update.</p></div>';message("No verified trend snapshot is available yet","muted");updated.textContent="";return}
 grid.innerHTML=rows.map((x,i)=>{
  const title=ur?x.title_ur:x.title_en,excerpt=ur?x.excerpt_ur:x.excerpt_en,country=Array.isArray(x.countries)?x.countries.join(" · "):(x.country||"");
  const image=x.image_url?'<img src="'+esc(x.image_url)+'" alt="" loading="'+(i<2?"eager":"lazy")+'" decoding="async">':'<div class="popular-news-image-fallback"><span>PN</span></div>';
  const source=x.source_url?'<a class="popular-news-source" href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.source_name||"Read source")+' ↗</a>':"";
  const label=state.window==="7d"?"Trending "+String(x.trend_count||1)+" days":"Google Search Trend";
  return '<article class="popular-news-card" style="--card-order:'+i+'"><div class="popular-news-card-image">'+image+'<span class="popular-news-live"><i></i>'+label+'</span></div><div class="popular-news-card-body"><div class="popular-news-meta"><span class="popular-news-category">'+esc(x.category||"Top News")+'</span><span>'+esc(country)+'</span></div><h3>'+esc(title)+'</h3><p>'+esc(excerpt)+'</p><div class="popular-news-card-footer">'+source+'<span class="popular-news-arrow">↗</span></div></div></article>';
 }).join("");
 const stamp=data.updated_at?new Date(data.updated_at).toLocaleString(ur?"ur-PK":"en-PK",{dateStyle:"medium",timeStyle:"short"}):"";
 updated.textContent=stamp?(ur?"آخری اپ ڈیٹ: ":"Updated ")+stamp:"";
 message(state.window==="7d"?"Ranked from the last seven daily trend snapshots":"Latest daily Google Trends snapshot","ready");
}
async function load(){if(state.loading)return;state.loading=true;grid.setAttribute("aria-busy","true");message("Loading verified trends…");
 try{const r=await fetch("/api/popular-news?window="+state.window,{cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Popular news unavailable.");render(d)}
 catch(e){grid.innerHTML='<div class="popular-news-empty"><strong>Popular news could not be loaded</strong><p>'+esc(e.message)+'</p></div>';message("Connection issue","error")}
 finally{state.loading=false;grid.setAttribute("aria-busy","false")}}
buttons.forEach(b=>b.addEventListener("click",()=>{if(state.window===b.dataset.popularWindow)return;state.window=b.dataset.popularWindow;buttons.forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-pressed",String(active))});load()}));
new MutationObserver(()=>{const l=document.documentElement.lang||"en";if(l!==state.lang){state.lang=l;load()}}).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});load();
})();