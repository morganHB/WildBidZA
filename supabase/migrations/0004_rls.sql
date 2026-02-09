-- Helper predicates
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

create or replace function public.is_approved_seller()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (p.seller_status = 'approved' or p.is_admin = true)
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.animal_categories enable row level security;
alter table public.auctions enable row level security;
alter table public.auction_images enable row level security;
alter table public.bids enable row level security;
alter table public.settings enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
create policy "profiles readable by everyone"
  on public.profiles
  for select
  using (true);

create policy "users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins can manage profiles"
  on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Categories
create policy "public can read active categories"
  on public.animal_categories
  for select
  using (is_active = true or public.is_admin());

create policy "admins can manage categories"
  on public.animal_categories
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Auctions
create policy "public can read active auctions"
  on public.auctions
  for select
  using (is_active = true and is_moderated = false);

create policy "approved sellers can insert auctions"
  on public.auctions
  for insert
  with check (
    public.is_approved_seller()
    and seller_id = auth.uid()
  );

create policy "approved sellers can update own auctions"
  on public.auctions
  for update
  using (
    seller_id = auth.uid()
    and public.is_approved_seller()
  )
  with check (
    seller_id = auth.uid()
    and public.is_approved_seller()
  );

create policy "admins can update auctions"
  on public.auctions
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Auction images
create policy "public can read auction images"
  on public.auction_images
  for select
  using (
    exists (
      select 1 from public.auctions a
      where a.id = auction_id
      and a.is_active = true
      and a.is_moderated = false
    )
    or public.is_admin()
  );

create policy "sellers can manage own auction images"
  on public.auction_images
  for all
  using (
    exists (
      select 1 from public.auctions a
      where a.id = auction_id
      and a.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.auctions a
      where a.id = auction_id
      and a.seller_id = auth.uid()
    )
  );

create policy "admins can manage auction images"
  on public.auction_images
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bids
create policy "public can read bids on visible auctions"
  on public.bids
  for select
  using (
    exists (
      select 1 from public.auctions a
      where a.id = auction_id
      and a.is_active = true
      and a.is_moderated = false
    )
  );

-- No insert policy on bids table by design.

-- Settings
create policy "public can read settings"
  on public.settings
  for select
  using (true);

create policy "admins can update settings"
  on public.settings
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Favorites
create policy "users manage own favorites"
  on public.favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications
create policy "users read own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "users update own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "system inserts notifications"
  on public.notifications
  for insert
  with check (public.is_admin() or auth.role() = 'service_role');

-- Audit log
create policy "admins read audit log"
  on public.audit_log
  for select
  using (public.is_admin());

create policy "service or admins write audit log"
  on public.audit_log
  for insert
  with check (public.is_admin() or auth.role() = 'service_role');

-- Permissions
revoke insert, update, delete on public.bids from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on public.favorites, public.notifications to authenticated;
grant insert, update on public.auctions, public.auction_images to authenticated;
grant usage on schema public to anon, authenticated;
