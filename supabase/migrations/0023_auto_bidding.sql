-- Auto-bid limits + atomic auto-bid processing in place_bid RPC

create table if not exists public.auto_bid_limits (
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  max_amount numeric(12,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (auction_id, bidder_id),
  constraint auto_bid_limits_positive_check check (max_amount > 0)
);

create index if not exists auto_bid_limits_auction_active_idx
  on public.auto_bid_limits (auction_id, is_active, max_amount desc, updated_at asc);

alter table public.auto_bid_limits enable row level security;

drop policy if exists "users can read own auto bid limits" on public.auto_bid_limits;
create policy "users can read own auto bid limits"
  on public.auto_bid_limits
  for select
  using (auth.uid() = bidder_id or public.is_admin());

drop policy if exists "users can insert own auto bid limits" on public.auto_bid_limits;
create policy "users can insert own auto bid limits"
  on public.auto_bid_limits
  for insert
  with check (auth.uid() = bidder_id);

drop policy if exists "users can update own auto bid limits" on public.auto_bid_limits;
create policy "users can update own auto bid limits"
  on public.auto_bid_limits
  for update
  using (auth.uid() = bidder_id or public.is_admin())
  with check (auth.uid() = bidder_id or public.is_admin());

drop policy if exists "users can delete own auto bid limits" on public.auto_bid_limits;
create policy "users can delete own auto bid limits"
  on public.auto_bid_limits
  for delete
  using (auth.uid() = bidder_id or public.is_admin());

grant select, insert, update, delete on public.auto_bid_limits to authenticated;

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
  v_auto_rounds int := 0;
  v_auto_placed int := 0;
  v_any_bid_placed boolean := false;
  v_next_auto_bidder uuid;
  v_next_auto_max numeric;
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

  if timezone('utc', now()) < v_auction.start_time then
    raise exception 'Auction is not live yet';
  end if;

  if timezone('utc', now()) >= v_auction.end_time or v_auction.status = 'ended' then
    raise exception 'Auction has ended';
  end if;

  select * into v_settings
  from public.settings
  where id = 1;

  select b.amount, b.bidder_id
  into v_current_highest, v_prev_leader
  from public.bids b
  where b.auction_id = v_auction.id
  order by b.amount desc, b.created_at asc
  limit 1;

  v_current_highest := coalesce(v_current_highest, v_auction.starting_bid - v_auction.min_increment);
  v_required_min := greatest(v_auction.starting_bid, v_current_highest + v_auction.min_increment);

  if p_amount < v_required_min then
    raise exception 'Bid must be at least %', v_required_min;
  end if;

  insert into public.bids (auction_id, bidder_id, amount)
  values (v_auction.id, v_user_id, p_amount)
  returning * into v_new_bid;

  v_any_bid_placed := true;

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

  -- Auto-bid engine:
  -- Keep placing one-increment responses while another active auto bidder
  -- can beat the current highest bid. Auction row lock guarantees atomicity.
  loop
    v_auto_rounds := v_auto_rounds + 1;
    if v_auto_rounds > 250 then
      exit;
    end if;

    select b.amount, b.bidder_id
    into v_current_highest, v_prev_leader
    from public.bids b
    where b.auction_id = v_auction.id
    order by b.amount desc, b.created_at asc
    limit 1;

    v_current_highest := coalesce(v_current_highest, v_auction.starting_bid - v_auction.min_increment);
    v_required_min := greatest(v_auction.starting_bid, v_current_highest + v_auction.min_increment);

    select abl.bidder_id, abl.max_amount
    into v_next_auto_bidder, v_next_auto_max
    from public.auto_bid_limits abl
    join public.profiles p on p.id = abl.bidder_id
    where abl.auction_id = v_auction.id
      and abl.is_active = true
      and abl.bidder_id <> v_prev_leader
      and abl.bidder_id <> v_auction.seller_id
      and p.approval_status = 'approved'
      and abl.max_amount >= v_required_min
    order by abl.max_amount desc, abl.updated_at asc, abl.bidder_id asc
    limit 1;

    if not found then
      exit;
    end if;

    insert into public.bids (auction_id, bidder_id, amount)
    values (v_auction.id, v_next_auto_bidder, v_required_min)
    returning * into v_new_bid;

    v_any_bid_placed := true;
    v_auto_placed := v_auto_placed + 1;

    if v_prev_leader is not null and v_prev_leader <> v_next_auto_bidder then
      insert into public.notifications (user_id, type, payload)
      values (
        v_prev_leader,
        'outbid',
        jsonb_build_object(
          'auction_id', v_auction.id,
          'auction_title', v_auction.title,
          'new_amount', v_required_min,
          'created_at', timezone('utc', now()),
          'via_auto_bid', true
        )
      );
    end if;
  end loop;

  select b.amount, b.bidder_id
  into v_current_highest, v_prev_leader
  from public.bids b
  where b.auction_id = v_auction.id
  order by b.amount desc, b.created_at asc
  limit 1;

  v_end_time := v_auction.end_time;

  if v_any_bid_placed
    and v_settings.sniping_window_minutes > 0
    and v_settings.extension_minutes > 0
    and (v_auction.end_time - timezone('utc', now())) <= make_interval(mins => v_settings.sniping_window_minutes)
  then
    v_end_time := v_auction.end_time + make_interval(mins => v_settings.extension_minutes);
  end if;

  update public.auctions
  set end_time = v_end_time,
      status = 'live',
      updated_at = timezone('utc', now())
  where id = v_auction.id;

  return jsonb_build_object(
    'auction_id', v_auction.id,
    'bid_id', v_new_bid.id,
    'amount', v_new_bid.amount,
    'bidder_id', v_new_bid.bidder_id,
    'created_at', v_new_bid.created_at,
    'current_highest', v_current_highest,
    'leader_bidder_id', v_prev_leader,
    'end_time', v_end_time,
    'auto_bids_processed', v_auto_placed,
    'bid_pricing_mode', v_auction.bid_pricing_mode,
    'animal_count', v_auction.animal_count,
    'current_total', case
      when v_auction.bid_pricing_mode = 'per_head' then v_current_highest * v_auction.animal_count
      else v_current_highest
    end
  );
end;
$$;

grant execute on function public.place_bid(uuid, numeric) to authenticated;
