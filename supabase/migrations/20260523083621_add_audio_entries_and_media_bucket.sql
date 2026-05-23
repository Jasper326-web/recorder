do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.entries'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%type%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.entries drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.entries
add constraint entries_type_check
check (type in ('text', 'video', 'audio'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-media',
  'entry-media',
  false,
  104857600,
  array[
    'video/webm',
    'video/mp4',
    'video/quicktime',
    'audio/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/ogg'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own entry media" on storage.objects;
create policy "Users can read their own entry media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'entry-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can insert their own entry media" on storage.objects;
create policy "Users can insert their own entry media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'entry-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own entry media" on storage.objects;
create policy "Users can update their own entry media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'entry-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'entry-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own entry media" on storage.objects;
create policy "Users can delete their own entry media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'entry-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
