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
