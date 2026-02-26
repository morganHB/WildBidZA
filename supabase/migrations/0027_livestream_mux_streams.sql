-- Persist Mux stream metadata on active livestream sessions.

alter table public.auction_livestream_sessions
  add column if not exists mux_live_stream_id text;

alter table public.auction_livestream_sessions
  add column if not exists mux_playback_id text;

alter table public.auction_livestream_sessions
  add column if not exists mux_stream_key text;

alter table public.auction_livestream_sessions
  add column if not exists mux_ingest_url text;

alter table public.auction_livestream_sessions
  add column if not exists mux_latency_mode text;

create index if not exists auction_livestream_sessions_mux_live_stream_idx
  on public.auction_livestream_sessions(mux_live_stream_id)
  where mux_live_stream_id is not null;

create index if not exists auction_livestream_sessions_mux_playback_idx
  on public.auction_livestream_sessions(mux_playback_id)
  where mux_playback_id is not null;
