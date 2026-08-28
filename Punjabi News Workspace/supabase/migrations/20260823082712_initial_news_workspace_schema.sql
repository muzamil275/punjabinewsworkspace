create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ur')),
  first_payment_bonus_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(category) between 1 and 40),
  title_en text not null check (char_length(title_en) between 1 and 160),
  title_ur text not null check (char_length(title_ur) between 1 and 160),
  excerpt_en text not null check (char_length(excerpt_en) between 1 and 500),
  excerpt_ur text not null check (char_length(excerpt_ur) between 1 and 500),
  daily_rank smallint not null check (daily_rank between 1 and 5),
  published_on date not null default current_date,
  is_published boolean not null default false,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (published_on, daily_rank)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null default 'premium' check (plan = 'premium'),
  status text not null check (status in ('provisional', 'active', 'cancelled', 'expired')),
  access_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_method text not null check (payment_method in ('easypaisa', 'ubl')),
  transaction_id text not null check (transaction_id ~ '^[A-Za-z0-9-]{6,80}$'),
  receipt_object_key text not null unique,
  amount_pkr numeric(10,2) not null default 500 check (amount_pkr = 500),
  status text not null check (status in ('provisional', 'approved', 'rejected')),
  provisional_ends_at timestamptz not null,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index news_posts_public_order_idx on public.news_posts (is_published, published_on desc, daily_rank asc);
create index subscriptions_user_access_idx on public.subscriptions (user_id, access_ends_at);
create index payment_submissions_user_status_idx on public.payment_submissions (user_id, status);
create index payment_submissions_status_created_idx on public.payment_submissions (status, created_at);

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 60), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

create function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure private.touch_updated_at();
create trigger news_posts_updated_at before update on public.news_posts for each row execute procedure private.touch_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute procedure private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.news_posts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_submissions enable row level security;

create policy "members read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "members update their display preferences" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "members read their own subscription" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "members read their own payment history" on public.payment_submissions for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.news_posts, public.subscriptions, public.payment_submissions from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, preferred_language) on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.payment_submissions to authenticated;
revoke execute on function private.handle_new_user() from public;
revoke execute on function private.touch_updated_at() from public;
