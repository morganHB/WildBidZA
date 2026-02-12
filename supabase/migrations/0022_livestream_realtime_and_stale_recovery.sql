-- Livestream robustness fixes: realtime publication + stale session takeover

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.auction_livestream_signals';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.auction_livestream_sessions';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.auction_livestream_viewers';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;

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

  if p_max_viewers < 1 or p_max_viewers > 100 then
    raise exception 'max_viewers must be between 1 and 100';
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
          max_viewers = greatest(1, least(p_max_viewers, 100)),
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
    greatest(1, least(p_max_viewers, 100)),
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

create or replace function public.join_livestream(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_auction public.auctions%rowtype;
  v_session public.auction_livestream_sessions%rowtype;
  v_active_count int;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_auction
  from public.auctions
  where id = p_auction_id
    and is_active = true
    and is_moderated = false;

  if not found then
    raise exception 'Auction not found or unavailable';
  end if;

  if v_auction.status = 'ended' or timezone('utc', now()) >= v_auction.end_time then
    raise exception 'Auction has ended';
  end if;

  select *
  into v_session
  from public.auction_livestream_sessions s
  where s.auction_id = p_auction_id
    and s.is_live = true
    and s.ended_at is null
  order by s.started_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No active livestream for this auction';
  end if;

  select count(*)::int
  into v_active_count
  from public.auction_livestream_viewers v
  where v.session_id = v_session.id
    and v.left_at is null
    and v.last_seen >= timezone('utc', now()) - interval '45 seconds';

  if v_user_id <> v_session.host_user_id then
    if not exists (
      select 1
      from public.auction_livestream_viewers v
      where v.session_id = v_session.id
        and v.viewer_user_id = v_user_id
        and v.left_at is null
        and v.last_seen >= timezone('utc', now()) - interval '45 seconds'
    ) then
      if v_active_count >= v_session.max_viewers then
        raise exception 'Livestream is full. Please try again shortly.';
      end if;
    end if;

    insert into public.auction_livestream_viewers (
      session_id,
      viewer_user_id,
      joined_at,
      last_seen,
      left_at
    )
    values (
      v_session.id,
      v_user_id,
      timezone('utc', now()),
      timezone('utc', now()),
      null
    )
    on conflict (session_id, viewer_user_id) do update
      set last_seen = timezone('utc', now()),
          left_at = null;
  end if;

  update public.auction_livestream_sessions
  set updated_at = timezone('utc', now())
  where id = v_session.id;

  select count(*)::int
  into v_active_count
  from public.auction_livestream_viewers v
  where v.session_id = v_session.id
    and v.left_at is null
    and v.last_seen >= timezone('utc', now()) - interval '45 seconds';

  return jsonb_build_object(
    'session_id', v_session.id,
    'auction_id', v_session.auction_id,
    'host_user_id', v_session.host_user_id,
    'viewer_user_id', v_user_id,
    'audio_enabled', v_session.audio_enabled,
    'max_viewers', v_session.max_viewers,
    'viewer_count', v_active_count,
    'started_at', v_session.started_at,
    'is_live', v_session.is_live
  );
end;
$$;

create or replace function public.publish_livestream_signal(
  p_session_id uuid,
  p_to_user_id uuid,
  p_signal_type public.livestream_signal_type,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.auction_livestream_sessions%rowtype;
  v_signal_id uuid;
  v_from_is_participant boolean := false;
  v_to_is_participant boolean := false;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_session
  from public.auction_livestream_sessions s
  where s.id = p_session_id
    and s.is_live = true
    and s.ended_at is null
  for update;

  if not found then
    raise exception 'Livestream session is not active';
  end if;

  if v_user_id = v_session.host_user_id then
    v_from_is_participant := true;
  else
    select exists (
      select 1
      from public.auction_livestream_viewers v
      where v.session_id = p_session_id
        and v.viewer_user_id = v_user_id
        and v.left_at is null
        and v.last_seen >= timezone('utc', now()) - interval '45 seconds'
    ) into v_from_is_participant;
  end if;

  if p_to_user_id = v_session.host_user_id then
    v_to_is_participant := true;
  else
    select exists (
      select 1
      from public.auction_livestream_viewers v
      where v.session_id = p_session_id
        and v.viewer_user_id = p_to_user_id
        and v.left_at is null
        and v.last_seen >= timezone('utc', now()) - interval '45 seconds'
    ) into v_to_is_participant;
  end if;

  if not v_from_is_participant then
    raise exception 'Sender is not an active participant in this session';
  end if;

  if not v_to_is_participant then
    raise exception 'Target user is not an active participant in this session';
  end if;

  insert into public.auction_livestream_signals (
    session_id,
    from_user_id,
    to_user_id,
    signal_type,
    payload,
    created_at
  )
  values (
    p_session_id,
    v_user_id,
    p_to_user_id,
    p_signal_type,
    coalesce(p_payload, '{}'::jsonb),
    timezone('utc', now())
  )
  returning id into v_signal_id;

  update public.auction_livestream_sessions
  set updated_at = timezone('utc', now())
  where id = p_session_id;

  return v_signal_id;
end;
$$;
