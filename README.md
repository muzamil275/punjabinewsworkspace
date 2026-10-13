# Punjabi News Workspace

Production Punjabi/Urdu news website with two deliberately separate reading modes: **Basic** (public) and **Premium** (verified subscribers).

## Actual production architecture

- Frontend: lightweight static HTML/CSS/JavaScript at the repository root.
- Backend: Vercel serverless functions under `api/` with shared helpers in `lib/api.js`.
- Database/Auth/Storage: Supabase.
- Deployment: Vercel production project `punjabi-news-workspace`.
- The nested `Punjabi News Workspace/punjabi/` directory is a separate Next.js template and is not the production frontend.
- The legacy Cloudflare Worker directory is retained as historical code and is not used by the production frontend.

## Modes

### Basic mode
Public reading mode for the daily Top 5. No Premium subscription is required.

### Premium mode
Separate reading mode for active Premium subscribers and the owner. Access is checked server-side through authenticated subscription state. Premium mode can be selected independently from Basic mode and is never silently mixed into the public mode.

## Core features

- Top 5 daily news with English and Urdu content.
- Persistent language preference and RTL/LTR switching.
- Owner-only news publishing, editing, deletion, and rank management.
- Premium subscription with manual Easypaisa/UBL proof verification.
- Private payment-proof storage.
- Owner-only payment review and subscription activation.
- Responsive editorial UI with accessibility-focused keyboard/focus behavior.

## Production configuration

Public browser configuration lives in `config.js`. Server-only environment variables belong in the Vercel project environment and must not be committed to Git.


## Optional mobile/browser news notifications

Readers can opt in using **News alerts** in the site header. The site uses standards-based Web Push through its existing server and database; no new third-party push platform is introduced. Notifications are sent after the owner publishes a story or the daily five-story edition is successfully published. The reader can switch them off from the same control.

Before enabling the feature:

1. Apply `security/web-push-notifications.sql` in the existing Supabase SQL editor.
2. Install the root dependency with the deployment's normal build/install process (`web-push` is declared in `package.json`).
3. Generate a VAPID key pair with `npx web-push generate-vapid-keys`.
4. Add these **server-side environment variables** to the existing API runtime: `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (for example, `mailto:owner@example.com`). Never put the private key or database secret in `config.js` or browser code.
5. Deploy the updated site/API, then open the site on a supported browser and tap **News alerts** to grant permission.

Push notifications require HTTPS and a browser/device that supports Web Push. On iPhone/iPad, install the site to the Home Screen first (iOS/iPadOS 16.4 or newer), then enable notifications from the installed web app. Notification delivery is controlled by the browser and device settings; users can revoke permission at any time.
