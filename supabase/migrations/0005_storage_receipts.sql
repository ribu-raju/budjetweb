-- =====================================================================
-- Receipt uploads: a private Storage bucket, scoped per family.
-- Files must be uploaded under the path "<family_id>/<filename>" —
-- the app enforces this (see lib/storage.ts) and these policies
-- enforce it again at the database level so a member can never read
-- or write another family's receipts, even if the client were
-- compromised.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "receipts_select_own_family"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );

create policy "receipts_insert_own_family"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.current_family_id()::text
    and owner = auth.uid()
  );

create policy "receipts_delete_own_family_admin_or_owner"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.current_family_id()::text
    and (owner = auth.uid() or public.is_admin())
  );
