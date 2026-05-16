insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-videos',
  'entry-videos',
  false,
  104857600,
  array['video/webm', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own entry videos" on storage.objects;
create policy "Users can read their own entry videos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'entry-videos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can insert their own entry videos" on storage.objects;
create policy "Users can insert their own entry videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'entry-videos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own entry videos" on storage.objects;
create policy "Users can update their own entry videos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'entry-videos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'entry-videos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own entry videos" on storage.objects;
create policy "Users can delete their own entry videos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'entry-videos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
