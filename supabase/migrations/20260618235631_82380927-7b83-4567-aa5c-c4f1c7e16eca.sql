drop policy if exists "debug-large-attachments upload" on storage.objects;
create policy "debug-large-attachments upload"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'debug-large-attachments');

drop policy if exists "debug-large-attachments read" on storage.objects;
create policy "debug-large-attachments read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'debug-large-attachments');