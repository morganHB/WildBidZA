do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'bid_pricing_mode'
      and n.nspname = 'public'
  ) then
    create type public.bid_pricing_mode as enum ('lot_total', 'per_head');
  end if;
end
$$;

alter table public.auctions
  add column if not exists bid_pricing_mode public.bid_pricing_mode not null default 'lot_total',
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists packet_series_id uuid,
  add column if not exists packet_sequence integer,
  add column if not exists previous_packet_auction_id uuid references public.auctions(id) on delete set null,
  add column if not exists is_waiting_for_previous boolean not null default false,
  add column if not exists auto_start_next boolean not null default true;

update public.auctions
set duration_minutes = greatest(
  10,
  ceil(extract(epoch from (end_time - start_time)) / 60.0)::integer
);

update public.auctions
set bid_pricing_mode = 'lot_total'
where bid_pricing_mode is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auctions_duration_minutes_check'
      and conrelid = 'public.auctions'::regclass
  ) then
    alter table public.auctions
      add constraint auctions_duration_minutes_check
      check (duration_minutes >= 10 and duration_minutes <= 10080);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auctions_waiting_previous_required_check'
      and conrelid = 'public.auctions'::regclass
  ) then
    alter table public.auctions
      add constraint auctions_waiting_previous_required_check
      check (not is_waiting_for_previous or previous_packet_auction_id is not null);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auctions_packet_series_sequence_consistency_check'
      and conrelid = 'public.auctions'::regclass
  ) then
    alter table public.auctions
      add constraint auctions_packet_series_sequence_consistency_check
      check (
        (packet_series_id is null and packet_sequence is null)
        or (packet_series_id is not null and packet_sequence is not null and packet_sequence >= 1)
      );
  end if;
end
$$;

create unique index if not exists auctions_packet_series_sequence_unique
  on public.auctions(packet_series_id, packet_sequence)
  where packet_series_id is not null;

create index if not exists auctions_previous_packet_idx
  on public.auctions(previous_packet_auction_id);

create index if not exists auctions_packet_series_idx
  on public.auctions(packet_series_id, packet_sequence);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'auction_images_unique_path'
      and conrelid = 'public.auction_images'::regclass
  ) then
    alter table public.auction_images
      drop constraint auction_images_unique_path;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auction_images_auction_storage_unique'
      and conrelid = 'public.auction_images'::regclass
  ) then
    alter table public.auction_images
      add constraint auction_images_auction_storage_unique
      unique (auction_id, storage_path);
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'auction_videos_unique_path'
      and conrelid = 'public.auction_videos'::regclass
  ) then
    alter table public.auction_videos
      drop constraint auction_videos_unique_path;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auction_videos_auction_storage_unique'
      and conrelid = 'public.auction_videos'::regclass
  ) then
    alter table public.auction_videos
      add constraint auction_videos_auction_storage_unique
      unique (auction_id, storage_path);
  end if;
end
$$;
