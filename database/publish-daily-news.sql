create or replace function private.publish_daily_news(p_secret text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
begin
  if p_secret is null or md5(p_secret) is distinct from (
    select secret_hash from private.popular_news_auth where id = true
  ) then
    raise exception 'Unauthorized';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) <> 5 then
    raise exception 'Exactly five news stories are required';
  end if;
  if (select count(distinct x.daily_rank) from jsonb_to_recordset(p_rows) as x(daily_rank integer)) <> 5 then
    raise exception 'Daily ranks must be unique';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as x(
      category text, title_en text, title_ur text, excerpt_en text, excerpt_ur text,
      source_name text, source_url text, image_url text, daily_rank integer
    )
    where x.daily_rank not between 1 and 5
       or coalesce(x.category,'') = '' or coalesce(x.title_en,'') = ''
       or coalesce(x.title_ur,'') = '' or coalesce(x.excerpt_en,'') = ''
       or coalesce(x.excerpt_ur,'') = '' or coalesce(x.source_name,'') = ''
       or coalesce(x.source_url,'') not like 'https://%'
       or coalesce(x.image_url,'') not like 'https://%'
  ) then raise exception 'A daily news story failed validation'; end if;
  if (select count(distinct x.source_url) from jsonb_to_recordset(p_rows) as x(source_url text)) <> 5 then
    raise exception 'Source URLs must be unique';
  end if;
  delete from public.news_posts where published_on = v_today;
  insert into public.news_posts (
    id, category, title_en, title_ur, excerpt_en, excerpt_ur, image_url,
    source_name, source_url, published_on, daily_rank, is_published, created_at, updated_at
  )
  select nextval('public.news_posts_id_seq'), x.category, x.title_en, x.title_ur,
    x.excerpt_en, x.excerpt_ur, x.image_url, x.source_name, x.source_url,
    v_today, x.daily_rank, true, now(), now()
  from jsonb_to_recordset(p_rows) as x(
    category text, title_en text, title_ur text, excerpt_en text, excerpt_ur text,
    image_url text, source_name text, source_url text, daily_rank integer
  )
  order by x.daily_rank;
  return 5;
end;
$function$;
revoke all on function private.publish_daily_news(text, jsonb) from public;
grant execute on function private.publish_daily_news(text, jsonb) to anon, authenticated;
create or replace function public.publish_daily_news(p_secret text, p_rows jsonb)
returns integer language sql security invoker
set search_path = pg_catalog, public, private
as $function$ select private.publish_daily_news(p_secret, p_rows); $function$;
grant execute on function public.publish_daily_news(text, jsonb) to anon, authenticated;
