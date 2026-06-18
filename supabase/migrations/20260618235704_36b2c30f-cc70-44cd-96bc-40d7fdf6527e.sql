drop policy if exists "debug-attachments public read" on storage.objects;
drop policy if exists "debug-attachments anon upload" on storage.objects;
drop policy if exists "Public read debug-attachments" on storage.objects;
drop policy if exists "Public upload debug-attachments" on storage.objects;

create policy "debug-attachments upload only"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'debug-attachments');