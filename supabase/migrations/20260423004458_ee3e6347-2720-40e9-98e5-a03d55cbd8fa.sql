insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'debug-attachments',
  'debug-attachments',
  true,
  20971520,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/zip']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "debug-attachments public read" on storage.objects;
create policy "debug-attachments public read"
on storage.objects for select
using (bucket_id = 'debug-attachments');

drop policy if exists "debug-attachments anon upload" on storage.objects;
create policy "debug-attachments anon upload"
on storage.objects for insert
with check (bucket_id = 'debug-attachments');