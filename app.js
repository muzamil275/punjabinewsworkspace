"use strict";
(() => {
  const cfg = window.PNW_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const state = { language: localStorage.getItem("pnw_language") || "en", token: localStorage.getItem("pnw_token") || "", user: null, subscription: null };
  const words = {
    en: { eyebrow: "DAILY NEWS, WITHOUT THE NOISE", headline: "Five stories worth your time.", heroCopy: "A focused English and Urdu news brief, updated by the owner every day.", premiumButton: "Go Premium — Rs 500/month", bonus: "First verified payment: 2 months for the price of 1", today: "TODAY'S TOP FIVE", topStories: "Top stories" },
    ur: { eyebrow: "روزانہ خبریں، بغیر شور کے", headline: "پانچ خبریں جو آپ کے وقت کے قابل ہیں۔", heroCopy: "انگریزی اور اردو میں مختصر خبریں، جو مالک ہر روز اپ ڈیٹ کرتا ہے۔", premiumButton: "پریمیم لیں — 500 روپے ماہانہ", bonus: "پہلی تصدیق شدہ ادائیگی: ایک کی قیمت میں دو ماہ", today: "آج کی پانچ بڑی خبریں", topStories: "اہم خبریں" }
  };
  const escape = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
  const isConfigured = () => cfg.API_URL && cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY;
  function toast(message, type = "") { const box = $("#toast"); box.textContent = message; box.className = `toast ${type}`; setTimeout(() => box.classList.add("hidden"), 4800); }
  async function api(path, options = {}) {
    if (!cfg.API_URL) throw new Error("The site is not configured yet.");
    const headers = new Headers(options.headers || {}); if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
    const response = await fetch(`${cfg.API_URL}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Request failed."); return payload;
  }
  function renderLanguage() {
    const t = words[state.language]; document.documentElement.lang = state.language; document.documentElement.dir = state.language === "ur" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t[node.dataset.i18n]; });
    $("#languageToggle").textContent = state.language === "en" ? "اردو" : "English"; localStorage.setItem("pnw_language", state.language); loadNews();
  }
  async function loadNews() {
    const grid = $("#newsGrid"); grid.innerHTML = '<div class="loading-card">Loading today’s brief…</div>';
    try {
      const data = await api(`/news?lang=${state.language}`); const posts = data.posts || [];
      $("#newsDate").textContent = new Intl.DateTimeFormat(state.language === "ur" ? "ur-PK" : "en-PK", { dateStyle: "medium" }).format(new Date());
      grid.innerHTML = posts.length ? posts.map((post, index) => `<article class="news-card"><span class="rank">0${index + 1}</span><span class="category">${escape(post.category)}</span><h3${state.language === "ur" ? ' dir="rtl" lang="ur"' : ""}>${escape(state.language === "ur" ? post.title_ur : post.title_en)}</h3><p${state.language === "ur" ? ' dir="rtl" lang="ur"' : ""}>${escape(state.language === "ur" ? post.excerpt_ur : post.excerpt_en)}</p></article>`).join("") : '<div class="loading-card">The owner has not published today’s five stories yet.</div>';
    } catch (error) { grid.innerHTML = `<div class="loading-card error">${escape(error.message)} Please check the deployment settings.</div>`; }
  }
  function openModal(html) { const root = $("#modalRoot"); root.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="close" aria-label="Close">×</button>${html}</div>`; root.classList.remove("hidden"); root.setAttribute("aria-hidden", "false"); root.querySelector(".close").onclick = closeModal; }
  function closeModal() { const root = $("#modalRoot"); root.classList.add("hidden"); root.setAttribute("aria-hidden", "true"); root.innerHTML = ""; }
  function premiumModal() { openModal(`<h2>Premium reading</h2><p>Rs 500 PKR per month. Your first verified payment unlocks two months of Premium access.</p><ul class="plan-list"><li>No ads</li><li>Eye-care colours and premium reading themes</li><li>Better typography and saved preferences</li><li>Priority owner support</li></ul><button class="primary" id="premiumContinue">Continue to payment</button>`); $("#premiumContinue").onclick = () => state.token ? paymentModal() : authModal("signup"); }
  function supportModal() { openModal(`<h2>Owner support</h2><p>For feedback, payment questions, and business support, contact Muhammad Muzamil.</p><div class="payment-method"><b>WhatsApp / Business contact</b><a href="https://wa.me/923425078246" target="_blank" rel="noopener">+92 342 5078246</a></div><div class="payment-method"><b>Email</b><a href="mailto:muzamil.275pk@gmail.com">muzamil.275pk@gmail.com</a></div>`); }
  function authModal(mode) {
    const signup = mode === "signup"; openModal(`<h2>${signup ? "Create your account" : "Welcome back"}</h2><p>${signup ? "Use your email to manage your Premium access and payment submissions." : "Sign in to view your subscription or send payment proof."}</p><form id="authForm"><label>${signup ? "Name" : "Email"}<input name="displayName" ${signup ? "required" : "class=hidden"} maxlength="60" autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" minlength="8" required autocomplete="${signup ? "new-password" : "current-password"}"></label><button class="primary" type="submit">${signup ? "Create account" : "Sign in"}</button></form><p><button class="footer-link" id="authSwitch">${signup ? "Already have an account? Sign in" : "Need an account? Create one"}</button></p>`);
    $("#authSwitch").onclick = () => authModal(signup ? "signin" : "signup"); $("#authForm").onsubmit = (event) => submitAuth(event, signup);
  }
  async function submitAuth(event, signup) {
    event.preventDefault(); if (!isConfigured()) return toast("Deployment settings are not configured.", "error");
    const form = new FormData(event.currentTarget), email = String(form.get("email")).trim(), password = String(form.get("password"));
    const endpoint = signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
    const body = signup ? { email, password, data: { display_name: String(form.get("displayName")).trim() } } : { email, password };
    try { const response = await fetch(`${cfg.SUPABASE_URL}${endpoint}`, { method: "POST", headers: { apikey: cfg.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.msg || data.error_description || "Authentication failed."); if (!data.access_token) { closeModal(); return toast("Check your email to confirm the account, then sign in.", "success"); } setSession(data); closeModal(); toast("Signed in successfully.", "success"); } catch (error) { toast(error.message, "error"); }
  }
  function setSession(session) { state.token = session.access_token; state.user = session.user || null; localStorage.setItem("pnw_token", state.token); refreshAccount(); }
  async function refreshAccount() {
    if (!state.token) { $("#accountButton").textContent = "Sign in"; $("#adminPanel").classList.add("hidden"); return; }
    try { const data = await api("/me"); state.user = data.user; state.subscription = data.subscription; $("#accountButton").textContent = data.subscription?.active ? "Premium account" : "My account"; if (data.user.isAdmin) { $("#adminPanel").classList.remove("hidden"); loadPayments(); } } catch { localStorage.removeItem("pnw_token"); state.token = ""; $("#accountButton").textContent = "Sign in"; }
  }
  function paymentModal() { openModal(`<h2>Send payment proof</h2><p>Payment creates immediate provisional Premium access. The owner will verify the transfer; an invalid proof removes access.</p><div class="payment-method"><b>Easypaisa</b>Muhammad Muzamil · +92 342 5078246</div><div class="payment-method"><b>UBL Bank</b>Muhammad Muzamil · PK91UNIL0109000315081244</div><form id="paymentForm"><label>Payment method<select name="method" required><option value="easypaisa">Easypaisa</option><option value="ubl">UBL Bank</option></select></label><label>Transaction ID<input name="transactionId" minlength="6" maxlength="80" required></label><label>Payment screenshot (JPG, PNG or PDF; max 5 MB)<input name="proof" type="file" accept="image/jpeg,image/png,application/pdf" required></label><button class="primary" type="submit">Activate provisional Premium</button></form>`); $("#paymentForm").onsubmit = submitPayment; }
  async function submitPayment(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get("proof"); if (!(file instanceof File) || file.size > 5 * 1024 * 1024) return toast("Use a JPG, PNG, or PDF below 5 MB.", "error"); try { const data = await api("/payments", { method: "POST", body: form }); closeModal(); toast(data.message, "success"); refreshAccount(); } catch (error) { toast(error.message, "error"); } }
  async function loadPayments() { const box = $("#paymentsList"); try { const data = await api("/admin/payments"); box.innerHTML = data.payments.length ? data.payments.map((p) => `<div class="payment-item"><b>${escape(p.profiles?.display_name || "Member")}</b> · ${escape(p.payment_method)}<br><small>${escape(p.transaction_id)} · ${escape(p.status)} · ends ${new Date(p.provisional_ends_at).toLocaleDateString()}</small><div class="payment-actions"><button class="approve" data-payment="${p.id}" data-action="approve">Approve</button><button class="reject" data-payment="${p.id}" data-action="reject">Reject</button><button data-payment="${p.id}" data-action="proof">Open proof</button></div></div>`).join("") : "No payment proofs awaiting review."; } catch (error) { box.textContent = error.message; } }
  async function reviewPayment(id, action) { try { if (action === "proof") return window.open(`${cfg.API_URL}/admin/payments/${id}/proof`, "_blank", "noopener"); await api(`/admin/payments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); toast(`Payment ${action}d.`, "success"); loadPayments(); } catch (error) { toast(error.message, "error"); } }
  async function publishNews(event) { event.preventDefault(); const f = new FormData(event.currentTarget); const payload = Object.fromEntries(f.entries()); try { await api("/admin/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); event.currentTarget.reset(); toast("News card published.", "success"); loadNews(); } catch (error) { toast(error.message, "error"); } }
  document.addEventListener("click", (event) => { const action = event.target.closest("[data-action]")?.dataset.action; if (action === "open-subscribe") premiumModal(); if (action === "open-support") supportModal(); if (event.target.dataset.payment) reviewPayment(event.target.dataset.payment, event.target.dataset.action); });
  $("#languageToggle").onclick = () => { state.language = state.language === "en" ? "ur" : "en"; renderLanguage(); };
  $("#accountButton").onclick = () => state.token ? premiumModal() : authModal("signin"); $("#refreshPayments").onclick = loadPayments; $("#newsForm").onsubmit = publishNews; $("#year").textContent = new Date().getFullYear();
  renderLanguage(); refreshAccount();
})();
