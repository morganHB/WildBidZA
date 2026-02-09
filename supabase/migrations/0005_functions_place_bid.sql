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

  if v_auction.seller_id = v_user_id then
    raise exception 'You cannot bid on your own auction';
  end if;

  if now() < v_auction.start_time then
    raise exception 'Auction is not live yet';
  end if;

  if now() >= v_auction.end_time or v_auction.status = 'ended' then
    raise exception 'Auction has ended';
  end if;

  select * into v_settings from public.settings where id = 1;

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
    'end_time', v_end_time
  );
end;
$$;

grant execute on function public.place_bid(uuid, numeric) to authenticated;
