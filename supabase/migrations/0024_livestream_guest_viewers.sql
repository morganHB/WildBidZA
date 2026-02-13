-- Allow public/guest livestream viewers by decoupling livestream participant IDs
-- from profile foreign keys. Host authorization remains enforced in API logic.

alter table public.auction_livestream_viewers
  drop constraint if exists auction_livestream_viewers_viewer_user_id_fkey;

alter table public.auction_livestream_signals
  drop constraint if exists auction_livestream_signals_from_user_id_fkey;

alter table public.auction_livestream_signals
  drop constraint if exists auction_livestream_signals_to_user_id_fkey;
