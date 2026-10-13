# Security

## Protect credentials

Never commit real API keys, access tokens, passwords, database service-role/secret keys, cron secrets, private keys, or payment-provider credentials. Store server-side secrets in the hosting provider's environment-variable settings.

`config.js` is browser-visible. It may contain only values that are intentionally public, such as the Supabase publishable key and payment instructions deliberately shown to visitors. A value is not secret merely because it is moved into another JavaScript file.

The Cloudflare Worker example file `.dev.vars.example` contains placeholders only. Put actual local Worker values in `.dev.vars`, which is ignored by Git.

## Report a concern privately

Please do not post live credentials, payment receipts, private user information, or an exploitable vulnerability in a public issue. Contact the site owner privately through the support email listed on the website and include a description and safe reproduction steps.

## Access-control expectations

- Free mode may read all published news editions and their date-picker entries.
- Premium-only actions (such as Gemini access and payment review) must be authorized server-side.
- Payment-proof files must remain in the private `payment-proofs` storage bucket.
- Premium activation and payment review must remain server-authorized.
