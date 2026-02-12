-- RLS + policy updates for auction managers and livestream tables

alter table public.auction_managers enable row level security;
alter table public.auction_livestream_sessions enable row level security;
alter table public.auction_livestream_viewers enable row level security;
alter table public.auction_livestream_signals enable row level security;

drop policy if exists "owners and admins can read auction managers" on public.auction_managers;
create policy "owners and admins can read auction managers"
  on public.auction_managers
  for select
  using (
    public.is_admin()
    or manager_user_id = auth.uid()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.seller_id = auth.uid()
    )
  );

drop policy if exists "owners and admins can insert auction managers" on public.auction_managers;
create policy "owners and admins can insert auction managers"
  on public.auction_managers
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.seller_id = auth.uid()
    )
  );

drop policy if exists "owners and admins can update auction managers" on public.auction_managers;
create policy "owners and admins can update auction managers"
  on public.auction_managers
  for update
  using (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.seller_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.seller_id = auth.uid()
    )
  );

drop policy if exists "owners and admins can delete auction managers" on public.auction_managers;
create policy "owners and admins can delete auction managers"
  on public.auction_managers
  for delete
  using (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.seller_id = auth.uid()
    )
  );

drop policy if exists "signed users can read active livestream sessions" on public.auction_livestream_sessions;
create policy "signed users can read active livestream sessions"
  on public.auction_livestream_sessions
  for select
  using (
    auth.uid() is not null
    and (
      (
        is_live = true
        and ended_at is null
        and exists (
          select 1
          from public.auctions a
          where a.id = auction_id
            and a.is_active = true
            and a.is_moderated = false
        )
      )
      or public.can_stream_auction(auction_id, auth.uid())
      or public.is_admin()
    )
  );

drop policy if exists "stream-authorized users can insert sessions" on public.auction_livestream_sessions;
create policy "stream-authorized users can insert sessions"
  on public.auction_livestream_sessions
  for insert
  with check (
    auth.uid() is not null
    and public.can_stream_auction(auction_id, auth.uid())
  );

drop policy if exists "stream-authorized users can update sessions" on public.auction_livestream_sessions;
create policy "stream-authorized users can update sessions"
  on public.auction_livestream_sessions
  for update
  using (
    auth.uid() is not null
    and (
      public.can_stream_auction(auction_id, auth.uid())
      or host_user_id = auth.uid()
      or public.is_admin()
    )
  )
  with check (
    auth.uid() is not null
    and (
      public.can_stream_auction(auction_id, auth.uid())
      or host_user_id = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "participants can read livestream viewers" on public.auction_livestream_viewers;
create policy "participants can read livestream viewers"
  on public.auction_livestream_viewers
  for select
  using (
    auth.uid() is not null
    and (
      viewer_user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.auction_livestream_sessions s
        where s.id = session_id
          and s.host_user_id = auth.uid()
      )
    )
  );

drop policy if exists "participants can insert livestream viewers" on public.auction_livestream_viewers;
create policy "participants can insert livestream viewers"
  on public.auction_livestream_viewers
  for insert
  with check (
    auth.uid() is not null
    and viewer_user_id = auth.uid()
  );

drop policy if exists "participants can update livestream viewers" on public.auction_livestream_viewers;
create policy "participants can update livestream viewers"
  on public.auction_livestream_viewers
  for update
  using (
    auth.uid() is not null
    and (
      viewer_user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.auction_livestream_sessions s
        where s.id = session_id
          and s.host_user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() is not null
    and (
      viewer_user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.auction_livestream_sessions s
        where s.id = session_id
          and s.host_user_id = auth.uid()
      )
    )
  );

drop policy if exists "participants can read livestream signals" on public.auction_livestream_signals;
create policy "participants can read livestream signals"
  on public.auction_livestream_signals
  for select
  using (
    auth.uid() is not null
    and (
      to_user_id = auth.uid()
      or from_user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.auction_livestream_sessions s
        where s.id = session_id
          and s.host_user_id = auth.uid()
      )
    )
  );

drop policy if exists "participants can insert livestream signals" on public.auction_livestream_signals;
create policy "participants can insert livestream signals"
  on public.auction_livestream_signals
  for insert
  with check (
    auth.uid() is not null
    and from_user_id = auth.uid()
  );

-- Auctions update policies: include invited managers via helper

drop policy if exists "approved sellers can update own auctions" on public.auctions;
drop policy if exists "admins can update auctions" on public.auctions;
create policy "auction managers can update auctions"
  on public.auctions
  for update
  using (
    auth.uid() is not null
    and public.can_manage_auction(id, auth.uid())
  )
  with check (
    auth.uid() is not null
    and public.can_manage_auction(id, auth.uid())
  );

-- Auction images policies: allow invited managers

drop policy if exists "sellers can manage own auction images" on public.auction_images;
drop policy if exists "admins can manage auction images" on public.auction_images;
create policy "auction managers can manage auction images"
  on public.auction_images
  for all
  using (
    auth.uid() is not null
    and public.can_manage_auction(auction_id, auth.uid())
  )
  with check (
    auth.uid() is not null
    and public.can_manage_auction(auction_id, auth.uid())
  );

-- Auction videos policies: allow invited managers

drop policy if exists "sellers can manage own auction videos" on public.auction_videos;
drop policy if exists "admins can manage auction videos" on public.auction_videos;
create policy "auction managers can manage auction videos"
  on public.auction_videos
  for all
  using (
    auth.uid() is not null
    and public.can_manage_auction(auction_id, auth.uid())
  )
  with check (
    auth.uid() is not null
    and public.can_manage_auction(auction_id, auth.uid())
  );

-- Function updates to honor invited manager rights

create or replace function public.upsert_auction_images(p_auction_id uuid, p_images jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_authorized boolean := false;
  v_item jsonb;
begin
  if auth.role() = 'service_role' then
    v_is_authorized := true;
  elsif v_user_id is not null then
    v_is_authorized := public.can_manage_auction(p_auction_id, v_user_id);
  end if;

  if not v_is_authorized then
    raise exception 'Not authorized to manage auction images';
  end if;

  delete from public.auction_images where auction_id = p_auction_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_images, '[]'::jsonb))
  loop
    insert into public.auction_images (auction_id, storage_path, sort_order)
    values (
      p_auction_id,
      v_item->>'storage_path',
      coalesce((v_item->>'sort_order')::integer, 0)
    );
  end loop;
end;
$$;

create or replace function public.upsert_auction_videos(p_auction_id uuid, p_videos jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_authorized boolean := false;
  v_item jsonb;
begin
  if auth.role() = 'service_role' then
    v_is_authorized := true;
  elsif v_user_id is not null then
    v_is_authorized := public.can_manage_auction(p_auction_id, v_user_id);
  end if;

  if not v_is_authorized then
    raise exception 'Not authorized to manage auction videos';
  end if;

  delete from public.auction_videos where auction_id = p_auction_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_videos, '[]'::jsonb))
  loop
    insert into public.auction_videos (
      auction_id,
      storage_path,
      sort_order,
      trim_start_seconds,
      trim_end_seconds,
      muted
    )
    values (
      p_auction_id,
      v_item->>'storage_path',
      coalesce((v_item->>'sort_order')::integer, 0),
      coalesce((v_item->>'trim_start_seconds')::numeric, 0),
      nullif(v_item->>'trim_end_seconds', '')::numeric,
      coalesce((v_item->>'muted')::boolean, false)
    );
  end loop;
end;
$$;

grant execute on function public.upsert_auction_images(uuid, jsonb) to authenticated;
grant execute on function public.upsert_auction_videos(uuid, jsonb) to authenticated;

grant select on public.auction_managers to authenticated;
grant insert, update, delete on public.auction_managers to authenticated;
grant select on public.auction_livestream_sessions to authenticated;
grant select on public.auction_livestream_viewers to authenticated;
grant select on public.auction_livestream_signals to authenticated;
