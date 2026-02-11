create or replace function public.can_activate_packet(p_auction_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.auctions a
    join public.auctions prev on prev.id = a.previous_packet_auction_id
    left join public.profiles actor on actor.id = p_user_id
    where a.id = p_auction_id
      and a.is_waiting_for_previous = true
      and (a.seller_id = p_user_id or coalesce(actor.is_admin, false) = true)
      and (prev.status = 'ended' or timezone('utc', now()) >= prev.end_time)
  );
$$;

grant execute on function public.can_activate_packet(uuid, uuid) to authenticated;
