-- Livestream permission helpers + session/signaling functions

create or replace function public.can_manage_auction(p_auction_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auctions a
    join public.profiles actor on actor.id = p_user_id
    left join public.auction_managers m
      on m.auction_id = a.id
     and m.manager_user_id = p_user_id
     and m.can_edit = true
    where a.id = p_auction_id
      and (
        actor.is_admin = true
        or (
          a.seller_id = p_user_id
          and actor.approval_status = 'approved'
          and (
            actor.role_group = 'marketer'
            or actor.seller_status = 'approved'
            or actor.is_admin = true
          )
        )
        or (
          m.manager_user_id is not null
          and actor.approval_status = 'approved'
          and (actor.role_group = 'marketer' or actor.is_admin = true)
        )
      )
  );
$$;

create or replace function public.can_stream_auction(p_auction_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auctions a
    join public.profiles actor on actor.id = p_user_id
    left join public.auction_managers m
      on m.auction_id = a.id
     and m.manager_user_id = p_user_id
     and m.can_stream = true
    where a.id = p_auction_id
      and (
        actor.is_admin = true
        or (
          a.seller_id = p_user_id
          and actor.approval_status = 'approved'
          and (
            actor.role_group = 'marketer'
            or actor.seller_status = 'approved'
            or actor.is_admin = true
          )
        )
        or (
          m.manager_user_id is not null
          and actor.approval_status = 'approved'
          and (actor.role_group = 'marketer' or actor.is_admin = true)
        )
      )
  );
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
    return jsonb_build_object(
      'session_id', v_existing.id,
      'auction_id', v_existing.auction_id,
      'host_user_id', v_existing.host_user_id,
      'audio_enabled', v_existing.audio_enabled,
      'max_viewers', v_existing.max_viewers,
      'started_at', v_existing.started_at,
      'is_live', v_existing.is_live
    );
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

create or replace function public.stop_livestream(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.auction_livestream_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.can_stream_auction(p_auction_id, v_user_id) then
    raise exception 'Not authorized to stop this livestream';
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
    return jsonb_build_object('stopped', false, 'auction_id', p_auction_id);
  end if;

  update public.auction_livestream_sessions
  set is_live = false,
      ended_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = v_session.id;

  update public.auction_livestream_viewers
  set left_at = coalesce(left_at, timezone('utc', now())),
      last_seen = timezone('utc', now())
  where session_id = v_session.id
    and left_at is null;

  return jsonb_build_object(
    'stopped', true,
    'auction_id', p_auction_id,
    'session_id', v_session.id
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

create or replace function public.touch_livestream_viewer(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  update public.auction_livestream_viewers
  set last_seen = timezone('utc', now())
  where session_id = p_session_id
    and viewer_user_id = v_user_id
    and left_at is null;
end;
$$;

create or replace function public.leave_livestream(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  update public.auction_livestream_viewers
  set left_at = timezone('utc', now()),
      last_seen = timezone('utc', now())
  where session_id = p_session_id
    and viewer_user_id = v_user_id
    and left_at is null;
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

  return v_signal_id;
end;
$$;

create or replace function public.finalize_ended_auctions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction record;
  v_top_bid record;
  v_count int := 0;
begin
  for v_auction in
    select a.id, a.title, a.seller_id
    from public.auctions a
    where a.status <> 'ended'
      and a.end_time <= timezone('utc', now())
      and a.is_active = true
      and a.is_waiting_for_previous = false
    for update skip locked
  loop
    select b.id, b.bidder_id, b.amount
      into v_top_bid
    from public.bids b
    where b.auction_id = v_auction.id
    order by b.amount desc, b.created_at asc
    limit 1;

    update public.auctions
    set status = 'ended',
        winner_user_id = v_top_bid.bidder_id,
        winning_bid_id = v_top_bid.id,
        updated_at = timezone('utc', now())
    where id = v_auction.id;

    update public.auction_livestream_sessions
    set is_live = false,
        ended_at = coalesce(ended_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where auction_id = v_auction.id
      and is_live = true
      and ended_at is null;

    update public.auction_livestream_viewers v
    set left_at = coalesce(v.left_at, timezone('utc', now())),
        last_seen = timezone('utc', now())
    where v.left_at is null
      and exists (
        select 1
        from public.auction_livestream_sessions s
        where s.id = v.session_id
          and s.auction_id = v_auction.id
      );

    if v_top_bid.bidder_id is not null then
      insert into public.auction_conversations (auction_id, seller_id, winner_id, created_at, updated_at)
      values (
        v_auction.id,
        v_auction.seller_id,
        v_top_bid.bidder_id,
        timezone('utc', now()),
        timezone('utc', now())
      )
      on conflict (auction_id) do update
      set seller_id = excluded.seller_id,
          winner_id = excluded.winner_id,
          updated_at = excluded.updated_at;

      insert into public.notifications (user_id, type, payload)
      values (
        v_top_bid.bidder_id,
        'won_auction',
        jsonb_build_object(
          'auction_id', v_auction.id,
          'auction_title', v_auction.title,
          'winning_amount', v_top_bid.amount,
          'created_at', timezone('utc', now())
        )
      );
    end if;

    perform public.activate_next_packet_if_needed(v_auction.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.can_manage_auction(uuid, uuid) to authenticated;
grant execute on function public.can_stream_auction(uuid, uuid) to authenticated;
grant execute on function public.start_livestream(uuid, boolean, int) to authenticated;
grant execute on function public.stop_livestream(uuid) to authenticated;
grant execute on function public.join_livestream(uuid) to authenticated;
grant execute on function public.touch_livestream_viewer(uuid) to authenticated;
grant execute on function public.leave_livestream(uuid) to authenticated;
grant execute on function public.publish_livestream_signal(uuid, uuid, public.livestream_signal_type, jsonb) to authenticated;
grant execute on function public.finalize_ended_auctions() to service_role;
