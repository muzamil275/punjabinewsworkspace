# Punjabi News Workspace

**Chosen public name:** Punjabi News Workspace  
**Primary deployment slug:** `punjabi-news-workspace`  
**Suggested temporary public URL:** `https://punjabi-news-workspace.vercel.app` (only if Vercel accepts the slug). A branded `.com` or `.pk` URL requires buying that domain.

This is a concise bilingual (English and Urdu) news service: the owner publishes five ranked news cards per day. It includes member accounts, a Premium plan for **Rs 500/month**, two months for a verified first payment, and private payment-proof uploads.

## Important payment design

Easypaisa and UBL personal transfers do **not** provide this project with a trustworthy automated verification webhook. Therefore:

1. A signed-in member uploads a screenshot and transaction ID.
2. The API gives **provisional Premium** for 60 days on their first payment and 30 days thereafter.
3. The owner opens the proof in the private admin queue and approves or rejects it.
4. Approve keeps the membership active and records the one-time first-payment bonus. Reject instantly cancels Premium.

This matches the requested immediate access while making fake screenshots reversible. Do not change the Worker to mark screenshot uploads as permanently paid without review.

## Project layout

| Folder | Purpose |
|---|---|
| `frontend/` | Static responsive site for Vercel or Cloudflare Pages |
| `worker/` | Cloudflare Worker API and private R2 proof storage |
| `supabase/` | Supabase CLI project and security-first SQL migration |

## Services and costs

Cloudflare R2 currently includes 10 GB-month storage, 1 million write/list operations, and 10 million read operations monthly at no cost. The Worker Free plan currently allows 100,000 requests/day with a 10 ms CPU limit, which is sufficient for this small service if the API stays lightweight. [R2 pricing](https://developers.cloudflare.com/r2/pricing/) · [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

**Do not launch this paid subscription website on Vercel Hobby.** Vercel documents Hobby as non-commercial/personal use only; a Premium subscription is commercial use. Keep the static frontend code as-is, but deploy it on **Cloudflare Pages** while you are on a free budget, or upgrade Vercel before taking payments. Cloudflare Pages supports static HTML and gives a `pages.dev` subdomain. [Vercel Hobby terms](https://vercel.com/docs/plans/hobby) · [Cloudflare Pages static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

Supabase Free is suitable for an early prototype (currently 500 MB database, 50,000 MAU), but inactive projects can be paused after one week. [Supabase pricing](https://supabase.com/pricing)

## Setup before first deployment

### 1. Supabase

1. Create a new Supabase project and enable **Email + Password** auth.
2. Set the Auth Site URL and redirect URLs to your deployed frontend URL.
3. Authenticate the CLI, link this project, and apply the migration:

   ```powershell
   cd "D:\ChatGPT Codex Folder Projects\Punjabi News Workspace"
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. Create the owner account in the published site, then copy that account's UUID from Supabase Authentication > Users. It becomes `ADMIN_USER_ID` below.

The migration enables RLS on every table. The browser never receives the Supabase service-role key. Current Supabase guidance requires RLS and warns not to use a service role or secret key in a browser. [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)

### 2. Cloudflare Worker and R2

1. In Cloudflare, create an R2 bucket named `punjabi-news-payment-proofs` with Standard storage.
2. Copy `worker/.dev.vars.example` to `worker/.dev.vars` for local work. Do not commit it.
3. In `worker/wrangler.jsonc`, replace `YOUR_PROJECT_REF` and replace `FRONTEND_ORIGIN` with the final frontend origin exactly.
4. Set production secrets. Never put these values in `wrangler.jsonc` or `frontend/config.js`:

   ```powershell
   cd worker
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put ADMIN_USER_ID
   npx wrangler deploy
   ```

The Worker writes payment proof files only to private R2. It returns a proof file only after checking the logged-in account matches `ADMIN_USER_ID`.

### 3. Frontend

1. Copy `frontend/config.example.js` to `frontend/config.js`.
2. Insert only the public API URL, Supabase URL, and Supabase publishable key. The publishable key is intentionally visible to visitors; the service-role key must never be there.
3. Deploy `frontend/` as a static site. For Vercel, import that directory. For free commercial-friendly hosting, use Cloudflare Pages with build command `exit 0` and output folder `frontend`.
4. Update `robots.txt` and `sitemap.xml` after the final host URL is known. Add the final URL to Google Search Console.

## Owner workflow

1. Sign in using the UUID set as `ADMIN_USER_ID`.
2. Enter each day's ranks 1–5, one English heading/summary and one Urdu heading/summary.
3. Open the payment queue; inspect the private proof, then approve or reject it.
4. Use the displayed support channels:
   - Easypaisa: Muhammad Muzamil, **+92 342 5078246**
   - UBL: Muhammad Muzamil, **PK91UNIL0109000315081244**
   - Email: **muzamil.275pk@gmail.com**

## Optional hardening before public launch

- Create a Cloudflare Turnstile widget for the payment form and set `TURNSTILE_SECRET` as a Worker secret. The Worker already verifies a supplied token when this secret exists; add the widget token to `FormData` as `turnstileToken` before enabling it.
- Add a payment dispute/refund and privacy-policy page before collecting money.
- Use a real payment gateway with webhook verification if a supported merchant account becomes available. That is the only safe way to make permanent Premium activation automatic.
- Add Cloudflare rate limiting or Turnstile before marketing the site widely.
