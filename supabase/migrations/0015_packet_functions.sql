create or replace function public.activate_packet(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor public.profiles%rowtype;
  v_auction public.auctions%rowtype;
  v_previous public.auctions%rowtype;
  v_start_time timestamptz;
  v_end_time timestamptz;
begin
  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    raise exception 'Packet auction not found';
  end if;

  if auth.role() <> 'service_role' then
    if v_user_id is null then
      raise exception 'Unauthorized';
    end if;

    select * into v_actor
    from public.profiles
    where id = v_user_id;

    if not found then
      raise exception 'Unauthorized';
    end if;

    if v_auction.seller_id <> v_user_id and v_actor.is_admin <> true then
      raise exception 'Not authorized to activate this packet';
    end if;
  end if;

  if v_auction.status = 'ended' then
    raise exception 'Packet auction has already ended';
  end if;

  if v_auction.is_waiting_for_previous = false then
    raise exception 'Packet auction is already active';
  end if;

  if v_auction.previous_packet_auction_id is null then
    raise exception 'Packet auction is missing previous packet reference';
  end if;

  select * into v_previous
  from public.auctions
  where id = v_auction.previous_packet_auction_id
  for update;

  if not found then
    raise exception 'Previous packet auction not found';
  end if;

  if v_previous.status <> 'ended' and timezone('utc', now()) < v_previous.end_time then
    raise exception 'Previous packet is still active';
  end if;

  v_start_time := timezone('utc', now());
  v_end_time := v_start_time + make_interval(mins => greatest(10, v_auction.duration_minutes));

  update public.auctions
  set start_time = v_start_time,
      end_time = v_end_time,
      is_waiting_for_previous = false,
      status = 'upcoming',
      updated_at = timezone('utc', now())
  where id = v_auction.id;

  return jsonb_build_object(
    'auction_id', v_auction.id,
    'start_time', v_start_time,
    'end_time', v_end_time,
    'packet_sequence', v_auction.packet_sequence,
    'packet_series_id', v_auction.packet_series_id
  );
end;
$$;

grant execute on function public.activate_packet(uuid) to authenticated, service_role;

create or replace function public.activate_next_packet_if_needed(p_ended_auction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ended public.auctions%rowtype;
  v_next_packet_id uuid;
begin
  select * into v_ended
  from public.auctions
  where id = p_ended_auction_id
  for update;

  if not found then
    return null;
  end if;

  if coalesce(v_ended.auto_start_next, true) = false then
    return null;
  end if;

  select a.id
  into v_next_packet_id
  from public.auctions a
  where a.previous_packet_auction_id = p_ended_auction_id
    and a.is_waiting_for_previous = true
    and a.is_active = true
  order by a.packet_sequence asc nulls last, a.created_at asc
  limit 1
  for update skip locked;

  if v_next_packet_id is null then
    return null;
  end if;

  perform public.activate_packet(v_next_packet_id);
  return v_next_packet_id;
end;
$$;

grant execute on function public.activate_next_packet_if_needed(uuid) to service_role;

create or replace function public.create_packet_series(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_settings public.settings%rowtype;
  v_series_id uuid := gen_random_uuid();
  v_packets jsonb := coalesce(p_payload->'packets', '[]'::jsonb);
  v_images jsonb := coalesce(p_payload->'images', '[]'::jsonb);
  v_videos jsonb := coalesce(p_payload->'videos', '[]'::jsonb);
  v_title text := nullif(trim(p_payload->>'title'), '');
  v_description text := nullif(trim(p_payload->>'description'), '');
  v_category_id uuid := (p_payload->>'category_id')::uuid;
  v_start_mode text := coalesce(p_payload->>'start_mode', 'immediate');
  v_scheduled_start timestamptz;
  v_first_start timestamptz;
  v_packet_item jsonb;
  v_packet_index integer := 0;
  v_previous_packet_id uuid;
  v_new_packet_id uuid;
  v_created_ids uuid[] := array[]::uuid[];
  v_packet_title text;
  v_packet_label text;
  v_packet_start timestamptz;
  v_packet_end timestamptz;
  v_packet_duration integer;
  v_packet_animal_count integer;
  v_packet_avg_weight numeric(10,2);
  v_packet_starting_bid numeric(12,2);
  v_packet_min_increment numeric(12,2);
  v_packet_reserve numeric(12,2);
  v_packet_auto_start boolean;
  v_image_item jsonb;
  v_video_item jsonb;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Unauthorized';
  end if;

  if v_profile.approval_status <> 'approved'
    or (
      v_profile.role_group <> 'marketer'
      and v_profile.seller_status <> 'approved'
      and v_profile.is_admin <> true
    )
  then
    raise exception 'Seller access is required';
  end if;

  if v_title is null or char_length(v_title) < 8 then
    raise exception 'Title must be at least 8 characters';
  end if;

  if v_description is null or char_length(v_description) < 10 then
    raise exception 'Description must be at least 10 characters';
  end if;

  if jsonb_typeof(v_packets) <> 'array' or jsonb_array_length(v_packets) = 0 then
    raise exception 'At least one packet is required';
  end if;

  select * into v_settings
  from public.settings
  where id = 1;

  if v_start_mode = 'scheduled' then
    v_scheduled_start := nullif(p_payload->>'scheduled_start', '')::timestamptz;

    if v_scheduled_start is null then
      raise exception 'Scheduled start time is required';
    end if;

    if v_scheduled_start <= timezone('utc', now()) then
      raise exception 'Scheduled start time must be in the future';
    end if;

    v_first_start := v_scheduled_start;
  else
    v_first_start := timezone('utc', now());
  end if;

  for v_packet_item in select * from jsonb_array_elements(v_packets)
  loop
    v_packet_index := v_packet_index + 1;
    v_packet_label := nullif(trim(v_packet_item->>'packet_label'), '');
    v_packet_title := coalesce(
      case
        when v_packet_label is not null then format('%s - %s', v_title, v_packet_label)
        else format('%s - Packet %s', v_title, v_packet_index::text)
      end,
      v_title
    );

    v_packet_duration := coalesce((v_packet_item->>'duration_minutes')::integer, 60);
    if v_packet_duration < 10 or v_packet_duration > 10080 then
      raise exception 'Packet duration must be between 10 and 10080 minutes';
    end if;

    v_packet_animal_count := coalesce((v_packet_item->>'animal_count')::integer, 1);
    if v_packet_animal_count < 1 then
      raise exception 'Animal count must be at least 1';
    end if;

    v_packet_avg_weight := nullif(v_packet_item->>'avg_weight_kg', '')::numeric;
    if v_packet_animal_count > 1 and v_packet_avg_weight is null then
      raise exception 'Average weight is required for packet herds';
    end if;

    if v_packet_avg_weight is not null and v_packet_avg_weight <= 0 then
      raise exception 'Average weight must be greater than 0';
    end if;

    v_packet_starting_bid := nullif(v_packet_item->>'starting_bid', '')::numeric;
    if v_packet_starting_bid is null or v_packet_starting_bid <= 0 then
      raise exception 'Packet starting bid must be greater than 0';
    end if;

    v_packet_min_increment := coalesce(
      nullif(v_packet_item->>'min_increment', '')::numeric,
      nullif(p_payload->>'min_increment', '')::numeric,
      v_settings.default_min_increment,
      100
    );

    if v_packet_min_increment <= 0 then
      raise exception 'Packet min increment must be greater than 0';
    end if;

    v_packet_reserve := nullif(v_packet_item->>'reserve_price', '')::numeric;
    if v_packet_reserve is not null and v_packet_reserve < v_packet_starting_bid then
      raise exception 'Packet reserve must be equal to or above starting bid';
    end if;

    v_packet_auto_start := coalesce((v_packet_item->>'auto_start_next')::boolean, true);

    v_packet_start := v_first_start;
    v_packet_end := v_packet_start + make_interval(mins => v_packet_duration);

    insert into public.auctions (
      seller_id,
      category_id,
      title,
      description,
      animal_count,
      avg_weight_kg,
      breed_type,
      sex,
      age,
      weight,
      province,
      city,
      farm_name,
      health_notes,
      permit_reference,
      collection_notes,
      starting_bid,
      min_increment,
      reserve_price,
      start_time,
      end_time,
      status,
      is_active,
      is_moderated,
      bid_pricing_mode,
      duration_minutes,
      packet_series_id,
      packet_sequence,
      previous_packet_auction_id,
      is_waiting_for_previous,
      auto_start_next
    )
    values (
      v_user_id,
      v_category_id,
      v_packet_title,
      v_description,
      v_packet_animal_count,
      v_packet_avg_weight,
      nullif(p_payload->>'breed_type', ''),
      nullif(p_payload->>'sex', ''),
      nullif(p_payload->>'age', ''),
      nullif(p_payload->>'weight', ''),
      nullif(p_payload->>'province', ''),
      nullif(p_payload->>'city', ''),
      nullif(p_payload->>'farm_name', ''),
      nullif(p_payload->>'health_notes', ''),
      nullif(p_payload->>'permit_reference', ''),
      nullif(p_payload->>'collection_notes', ''),
      v_packet_starting_bid,
      v_packet_min_increment,
      v_packet_reserve,
      v_packet_start,
      v_packet_end,
      'upcoming',
      true,
      false,
      'per_head',
      v_packet_duration,
      v_series_id,
      v_packet_index,
      v_previous_packet_id,
      (v_packet_index > 1),
      v_packet_auto_start
    )
    returning id into v_new_packet_id;

    if jsonb_typeof(v_images) = 'array' then
      for v_image_item in select * from jsonb_array_elements(v_images)
      loop
        insert into public.auction_images (auction_id, storage_path, sort_order)
        values (
          v_new_packet_id,
          v_image_item->>'storage_path',
          coalesce((v_image_item->>'sort_order')::integer, 0)
        );
      end loop;
    end if;

    if jsonb_typeof(v_videos) = 'array' then
      for v_video_item in select * from jsonb_array_elements(v_videos)
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
          v_new_packet_id,
          v_video_item->>'storage_path',
          coalesce((v_video_item->>'sort_order')::integer, 0),
          coalesce((v_video_item->>'trim_start_seconds')::numeric, 0),
          nullif(v_video_item->>'trim_end_seconds', '')::numeric,
          coalesce((v_video_item->>'muted')::boolean, false)
        );
      end loop;
    end if;

    v_created_ids := array_append(v_created_ids, v_new_packet_id);
    v_previous_packet_id := v_new_packet_id;
  end loop;

  return jsonb_build_object(
    'series_id', v_series_id,
    'auction_ids', to_jsonb(v_created_ids)
  );
end;
$$;

grant execute on function public.create_packet_series(jsonb) to authenticated;

create or replace function public.place_bid(p_auction_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_auction public.auctions%rowtype;
  v_settings public.settings%rowtype;
  v_current_highest numeric;
  v_required_min numeric;
  v_prev_leader uuid;
  v_new_bid public.bids%rowtype;
  v_end_time timestamptz;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if not found or v_profile.approval_status <> 'approved' then
    raise exception 'Account is not approved for bidding';
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
    and is_active = true
    and is_moderated = false
  for update;

  if not found then
    raise exception 'Auction not found or unavailable';
  end if;

  if v_auction.is_waiting_for_previous = true then
    raise exception 'This packet is waiting for the previous packet to close';
  end if;

  if v_auction.seller_id = v_user_id then
    raise exception 'You cannot bid on your own auction';
  end if;

  if now() < v_auction.start_time then
    raise exception 'Auction is not live yet';
  end if;

  if now() >= v_auction.end_time or v_auction.status = 'ended' then
    raise exception 'Auction has ended';
  end if;

  select * into v_settings
  from public.settings
  where id = 1;

  select b.amount, b.bidder_id
  into v_current_highest, v_prev_leader
  from public.bids b
  where b.auction_id = v_auction.id
  order by b.amount desc, b.created_at desc
  limit 1;

  v_current_highest := coalesce(v_current_highest, v_auction.starting_bid - v_auction.min_increment);
  v_required_min := greatest(v_auction.starting_bid, v_current_highest + v_auction.min_increment);

  if p_amount < v_required_min then
    raise exception 'Bid must be at least %', v_required_min;
  end if;

  insert into public.bids (auction_id, bidder_id, amount)
  values (v_auction.id, v_user_id, p_amount)
  returning * into v_new_bid;

  v_end_time := v_auction.end_time;

  if v_settings.sniping_window_minutes > 0
    and v_settings.extension_minutes > 0
    and (v_auction.end_time - now()) <= make_interval(mins => v_settings.sniping_window_minutes)
  then
    v_end_time := v_auction.end_time + make_interval(mins => v_settings.extension_minutes);

    update public.auctions
    set end_time = v_end_time,
        status = 'live',
        updated_at = timezone('utc', now())
    where id = v_auction.id;
  else
    update public.auctions
    set status = 'live',
        updated_at = timezone('utc', now())
    where id = v_auction.id;
  end if;

  if v_prev_leader is not null and v_prev_leader <> v_user_id then
    insert into public.notifications (user_id, type, payload)
    values (
      v_prev_leader,
      'outbid',
      jsonb_build_object(
        'auction_id', v_auction.id,
        'auction_title', v_auction.title,
        'new_amount', p_amount,
        'created_at', timezone('utc', now())
      )
    );
  end if;

  return jsonb_build_object(
    'auction_id', v_auction.id,
    'bid_id', v_new_bid.id,
    'amount', v_new_bid.amount,
    'bidder_id', v_new_bid.bidder_id,
    'created_at', v_new_bid.created_at,
    'current_highest', p_amount,
    'end_time', v_end_time,
    'bid_pricing_mode', v_auction.bid_pricing_mode,
    'animal_count', v_auction.animal_count,
    'current_total', case
      when v_auction.bid_pricing_mode = 'per_head' then p_amount * v_auction.animal_count
      else p_amount
    end
  );
end;
$$;

grant execute on function public.place_bid(uuid, numeric) to authenticated;

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

grant execute on function public.finalize_ended_auctions() to service_role;
