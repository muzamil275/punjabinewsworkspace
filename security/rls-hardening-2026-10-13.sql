-- Applied to the production Supabase project on 2026-10-13.
-- Keeps public news access to today's edition plus the latest complete fallback edition
-- only when today's five-story edition is not complete; Premium history remains protected.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.public_news_fallback_date(p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH current_edition AS (
    SELECT count(DISTINCT n.daily_rank)
      FILTER (WHERE n.is_published = true AND n.daily_rank BETWEEN 1 AND 5) AS rank_count
    FROM public.news_posts AS n
    WHERE n.published_on = ((now() AT TIME ZONE 'Asia/Karachi')::date)
  ),
  latest_complete AS (
    SELECT max(editions.published_on) AS published_on
    FROM (
      SELECT n.published_on
      FROM public.news_posts AS n
      WHERE n.is_published = true
      GROUP BY n.published_on
      HAVING count(DISTINCT n.daily_rank)
        FILTER (WHERE n.daily_rank BETWEEN 1 AND 5) = 5
    ) AS editions
  )
  SELECT COALESCE((SELECT rank_count FROM current_edition), 0) < 5
    AND p_date = (SELECT published_on FROM latest_complete);
$function$;

REVOKE ALL ON FUNCTION private.public_news_fallback_date(date) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.public_news_fallback_date(date) TO anon;

ALTER POLICY "public can read all published news"
ON public.news_posts
USING (
  is_published = true
  AND (
    published_on = ((now() AT TIME ZONE 'Asia/Karachi')::date)
    OR private.public_news_fallback_date(published_on)
  )
);

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
