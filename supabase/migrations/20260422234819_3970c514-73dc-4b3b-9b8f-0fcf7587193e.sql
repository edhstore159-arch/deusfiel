-- Replace permissive SELECT policy with one that doesn't allow LISTING
-- (public access via signed/public URL still works because bucket.public = true)
drop policy if exists "Public read debug-attachments" on storage.objects;