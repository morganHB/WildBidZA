do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'role_group'
      and n.nspname = 'public'
  ) then
    create type public.role_group as enum ('user', 'marketer');
  end if;
end
$$;

alter table public.profiles
  add column if not exists role_group public.role_group not null default 'user';

update public.profiles
set role_group = case
  when is_admin = true then 'marketer'::public.role_group
  when seller_status = 'approved' then 'marketer'::public.role_group
  else 'user'::public.role_group
end;

create index if not exists profiles_role_group_idx on public.profiles(role_group);

create table if not exists public.auction_videos (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null,
  storage_path text not null,
  sort_order int not null default 0,
  trim_start_seconds numeric(8,2) not null default 0,
  trim_end_seconds numeric(8,2),
  muted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint auction_videos_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint auction_videos_unique_path unique (storage_path),
  constraint auction_videos_trim_start_non_negative check (trim_start_seconds >= 0),
  constraint auction_videos_trim_end_positive check (trim_end_seconds is null or trim_end_seconds > 0),
  constraint auction_videos_trim_window_valid check (trim_end_seconds is null or trim_end_seconds > trim_start_seconds)
);

create index if not exists auction_videos_auction_sort_idx on public.auction_videos(auction_id, sort_order);

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
      and (
        p.role_group = 'marketer'
        or p.seller_status = 'approved'
        or p.is_admin = true
      )
  );
$$;

create or replace function public.upsert_auction_videos(p_auction_id uuid, p_videos jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_user_id uuid := auth.uid();
  v_is_owner boolean;
begin
  select exists (
    select 1
    from public.auctions a
    where a.id = p_auction_id
      and (a.seller_id = v_user_id or public.is_admin())
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Not authorized to manage auction videos';
  end if;

  delete from public.auction_videos where auction_id = p_auction_id;

  for v_item in select * from jsonb_array_elements(p_videos)
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
      coalesce((v_item->>'sort_order')::int, 0),
      coalesce((v_item->>'trim_start_seconds')::numeric, 0),
      nullif(v_item->>'trim_end_seconds', '')::numeric,
      coalesce((v_item->>'muted')::boolean, false)
    );
  end loop;
end;
$$;

grant execute on function public.upsert_auction_videos(uuid, jsonb) to authenticated;

alter table public.auction_videos enable row level security;

drop policy if exists "public can read auction videos" on public.auction_videos;
create policy "public can read auction videos"
  on public.auction_videos
  for select
  using (
    exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.is_active = true
        and a.is_moderated = false
    )
    or public.is_admin()
  );

drop policy if exists "sellers can manage own auction videos" on public.auction_videos;
create policy "sellers can manage own auction videos"
  on public.auction_videos
  for all
  using (
    exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and a.seller_id = auth.uid()
    )
  );

drop policy if exists "admins can manage auction videos" on public.auction_videos;
create policy "admins can manage auction videos"
  on public.auction_videos
  for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.auction_videos to anon, authenticated;
grant insert, update, delete on public.auction_videos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'auction-images',
  'auction-images',
  true,
  83886080,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
