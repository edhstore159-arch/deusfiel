-- Public bucket for Debug Tool attachments (images, zips, etc.)
insert into storage.buckets (id, name, public)
values ('debug-attachments', 'debug-attachments', true)
on conflict (id) do nothing;

-- Allow anyone to read files (bucket is public anyway, but explicit policy)
create policy "Public read debug-attachments"
on storage.objects for select
using (bucket_id = 'debug-attachments');

-- Allow anyone (including anonymous) to upload to this bucket.
-- This is intentionally permissive because the Debug Tool runs without auth.
create policy "Public upload debug-attachments"
on storage.objects for insert
with check (bucket_id = 'debug-attachments');