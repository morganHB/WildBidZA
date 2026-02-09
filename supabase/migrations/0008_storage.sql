insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'auction-images',
  'auction-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public read access
create policy "public can view auction images"
on storage.objects
for select
using (bucket_id = 'auction-images');

-- Sellers upload to own folder
create policy "sellers upload own auction images"
on storage.objects
for insert
with check (
  bucket_id = 'auction-images'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (p.seller_status = 'approved' or p.is_admin = true)
  )
);

-- Sellers update/delete own folder
create policy "sellers update own auction images"
on storage.objects
for update
using (
  bucket_id = 'auction-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'auction-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "sellers delete own auction images"
on storage.objects
for delete
using (
  bucket_id = 'auction-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Admin override
create policy "admins manage all auction images"
on storage.objects
for all
using (
  bucket_id = 'auction-images'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  bucket_id = 'auction-images'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);
