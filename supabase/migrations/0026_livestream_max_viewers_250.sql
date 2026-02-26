-- Raise livestream viewer cap to support larger public rooms.

alter table public.auction_livestream_sessions
  drop constraint if exists auction_livestream_sessions_max_viewers_check;

alter table public.auction_livestream_sessions
  add constraint auction_livestream_sessions_max_viewers_check
  check (max_viewers between 1 and 250);

create or replace function public.start_livestream(
  p_auction_id uuid,
  p_audio_enabled boolean,
  p_max_viewers int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_auction public.auctions%rowtype;
  v_existing public.auction_livestream_sessions%rowtype;
  v_session public.auction_livestream_sessions%rowtype;
  v_active_viewers int := 0;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_max_viewers < 1 or p_max_viewers > 250 then
    raise exception 'max_viewers must be between 1 and 250';
  end if;

  if not public.can_stream_auction(p_auction_id, v_user_id) then
    raise exception 'Not authorized to start a livestream for this auction';
  end if;

  select *
  into v_auction
  from public.auctions
  where id = p_auction_id
    and is_active = true
    and is_moderated = false
  for update;

  if not found then
    raise exception 'Auction not found or unavailable';
  end if;

  if v_auction.status = 'ended' or timezone('utc', now()) >= v_auction.end_time then
    raise exception 'Auction has already ended';
  end if;

  if timezone('utc', now()) < v_auction.start_time then
    raise exception 'Auction is not live yet';
  end if;

  select *
  into v_existing
  from public.auction_livestream_sessions s
  where s.auction_id = p_auction_id
    and s.is_live = true
    and s.ended_at is null
  order by s.started_at desc
  limit 1
  for update;

  if found then
    if v_existing.host_user_id = v_user_id then
      update public.auction_livestream_sessions
      set audio_enabled = coalesce(p_audio_enabled, audio_enabled),
          max_viewers = greatest(1, least(p_max_viewers, 250)),
          updated_at = timezone('utc', now())
      where id = v_existing.id
      returning * into v_session;

      return jsonb_build_object(
        'session_id', v_session.id,
        'auction_id', v_session.auction_id,
        'host_user_id', v_session.host_user_id,
        'audio_enabled', v_session.audio_enabled,
        'max_viewers', v_session.max_viewers,
        'started_at', v_session.started_at,
        'is_live', v_session.is_live
      );
    end if;

    select count(*)::int
    into v_active_viewers
    from public.auction_livestream_viewers v
    where v.session_id = v_existing.id
      and v.left_at is null
      and v.last_seen >= timezone('utc', now()) - interval '45 seconds';

    if v_active_viewers > 0
      or v_existing.updated_at >= timezone('utc', now()) - interval '90 seconds'
    then
      raise exception 'Another livestream host is currently active for this auction';
    end if;

    update public.auction_livestream_sessions
    set is_live = false,
        ended_at = coalesce(ended_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where id = v_existing.id;

    update public.auction_livestream_viewers
    set left_at = coalesce(left_at, timezone('utc', now())),
        last_seen = timezone('utc', now())
    where session_id = v_existing.id
      and left_at is null;
  end if;

  insert into public.auction_livestream_sessions (
    auction_id,
    host_user_id,
    is_live,
    started_at,
    audio_enabled,
    max_viewers,
    created_at,
    updated_at
  )
  values (
    p_auction_id,
    v_user_id,
    true,
    timezone('utc', now()),
    coalesce(p_audio_enabled, true),
    greatest(1, least(p_max_viewers, 250)),
    timezone('utc', now()),
    timezone('utc', now())
  )
  returning * into v_session;

  return jsonb_build_object(
    'session_id', v_session.id,
    'auction_id', v_session.auction_id,
    'host_user_id', v_session.host_user_id,
    'audio_enabled', v_session.audio_enabled,
    'max_viewers', v_session.max_viewers,
    'started_at', v_session.started_at,
    'is_live', v_session.is_live
  );
end;
$$;
