create table if not exists public.entries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null check (type in ('text', 'video')),
  prompt_answers jsonb not null default '{}'::jsonb,
  body_text text not null default '',
  video_blob_ref text,
  title text not null default '',
  category text not null check (category in ('情绪控制力', '生活觉知力', '口才表达能力', '头脑清晰度')),
  tags text[] not null default '{}',
  ai_summary text not null default '',
  ai_reflection text not null default ''
);

create index if not exists entries_user_created_at_idx
  on public.entries (user_id, created_at desc);

create index if not exists entries_user_category_idx
  on public.entries (user_id, category);

create index if not exists entries_tags_idx
  on public.entries using gin (tags);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
before update on public.entries
for each row
execute function public.set_updated_at();

alter table public.entries enable row level security;

grant select, insert, update, delete on public.entries to authenticated;

drop policy if exists "Users can read their own entries" on public.entries;
create policy "Users can read their own entries"
on public.entries
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own entries" on public.entries;
create policy "Users can insert their own entries"
on public.entries
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own entries" on public.entries;
create policy "Users can update their own entries"
on public.entries
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own entries" on public.entries;
create policy "Users can delete their own entries"
on public.entries
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
