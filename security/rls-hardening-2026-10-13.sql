-- Production RLS configuration for the current product behavior.
-- Free mode supports date-search for all published daily editions (from 2026-09-04).
-- The Premium UI has a separate authenticated access flow; public news content itself is published.
ALTER POLICY "public can read all published news"
ON public.news_posts
USING (is_published = true);

ALTER POLICY "authenticated can read today news"
ON public.news_posts
USING (is_published = true);

DROP FUNCTION IF EXISTS private.public_news_fallback_date(date);

-- A user may submit only their own pending payment, with valid fields and a proof
-- object inside their own private storage folder. Only the owner can review it.
ALTER POLICY "users insert own payments"
ON public.payments
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND method IN ('easypaisa','ubl')
  AND amount = 500
  AND transaction_id ~ '^[A-Za-z0-9-]{6,80}$'
  AND proof_path IS NOT NULL
  AND proof_path LIKE (auth.uid()::text || '/%')
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
);
