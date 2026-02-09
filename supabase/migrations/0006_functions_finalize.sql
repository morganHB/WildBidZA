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
    select a.id, a.title
    from public.auctions a
    where a.status <> 'ended'
      and a.end_time <= timezone('utc', now())
      and a.is_active = true
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

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.finalize_ended_auctions() to service_role;

select cron.unschedule('savannabid_finalize_auctions')
where exists (
  select 1
  from cron.job
  where jobname = 'savannabid_finalize_auctions'
);

select cron.schedule(
  'savannabid_finalize_auctions',
  '* * * * *',
  $$select public.finalize_ended_auctions();$$
);
