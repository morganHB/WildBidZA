-- Auction managers + livestream core tables

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'livestream_signal_type'
      and n.nspname = 'public'
  ) then
    create type public.livestream_signal_type as enum ('offer', 'answer', 'ice_candidate', 'leave');
  end if;
end
$$;

create table if not exists public.auction_managers (
  auction_id uuid not null,
  manager_user_id uuid not null,
  invited_by_user_id uuid not null,
  can_edit boolean not null default true,
  can_stream boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint auction_managers_pkey primary key (auction_id, manager_user_id),
  constraint auction_managers_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint auction_managers_manager_user_id_fkey foreign key (manager_user_id) references public.profiles(id) on delete cascade,
  constraint auction_managers_invited_by_user_id_fkey foreign key (invited_by_user_id) references public.profiles(id) on delete restrict,
  constraint auction_managers_inviter_not_manager check (manager_user_id <> invited_by_user_id)
);

create index if not exists auction_managers_manager_idx
  on public.auction_managers(manager_user_id, created_at desc);

create table if not exists public.auction_livestream_sessions (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null,
  host_user_id uuid not null,
  is_live boolean not null default true,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  audio_enabled boolean not null default true,
  max_viewers integer not null default 30,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint auction_livestream_sessions_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint auction_livestream_sessions_host_user_id_fkey foreign key (host_user_id) references public.profiles(id) on delete restrict,
  constraint auction_livestream_sessions_max_viewers_check check (max_viewers between 1 and 100)
);

create unique index if not exists auction_livestream_sessions_active_unique
  on public.auction_livestream_sessions(auction_id)
  where is_live = true and ended_at is null;

create index if not exists auction_livestream_sessions_auction_live_idx
  on public.auction_livestream_sessions(auction_id, is_live, updated_at desc);

create index if not exists auction_livestream_sessions_host_idx
  on public.auction_livestream_sessions(host_user_id, created_at desc);

create table if not exists public.auction_livestream_viewers (
  session_id uuid not null,
  viewer_user_id uuid not null,
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  constraint auction_livestream_viewers_pkey primary key (session_id, viewer_user_id),
  constraint auction_livestream_viewers_session_id_fkey foreign key (session_id) references public.auction_livestream_sessions(id) on delete cascade,
  constraint auction_livestream_viewers_viewer_user_id_fkey foreign key (viewer_user_id) references public.profiles(id) on delete cascade
);

create index if not exists auction_livestream_viewers_session_active_idx
  on public.auction_livestream_viewers(session_id, left_at, last_seen desc);

create index if not exists auction_livestream_viewers_user_recent_idx
  on public.auction_livestream_viewers(viewer_user_id, last_seen desc);

create table if not exists public.auction_livestream_signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  from_user_id uuid not null,
  to_user_id uuid not null,
  signal_type public.livestream_signal_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint auction_livestream_signals_session_id_fkey foreign key (session_id) references public.auction_livestream_sessions(id) on delete cascade,
  constraint auction_livestream_signals_from_user_id_fkey foreign key (from_user_id) references public.profiles(id) on delete cascade,
  constraint auction_livestream_signals_to_user_id_fkey foreign key (to_user_id) references public.profiles(id) on delete cascade,
  constraint auction_livestream_signals_payload_object_check check (jsonb_typeof(payload) in ('object', 'array', 'string', 'number', 'boolean', 'null'))
);

create index if not exists auction_livestream_signals_session_to_idx
  on public.auction_livestream_signals(session_id, to_user_id, created_at desc);

create index if not exists auction_livestream_signals_session_from_idx
  on public.auction_livestream_signals(session_id, from_user_id, created_at desc);
