create or replace function public.upsert_auction_images(p_auction_id uuid, p_images jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_user_id uuid := auth.uid();
  v_is_owner boolean;
begin
  select exists (
    select 1
    from public.auctions a
    where a.id = p_auction_id
      and (a.seller_id = v_user_id or public.is_admin())
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Not authorized to manage auction images';
  end if;

  delete from public.auction_images where auction_id = p_auction_id;

  for v_item in select * from jsonb_array_elements(p_images)
  loop
    insert into public.auction_images (auction_id, storage_path, sort_order)
    values (
      p_auction_id,
      v_item->>'storage_path',
      coalesce((v_item->>'sort_order')::int, 0)
    );
  end loop;
end;
$$;

grant execute on function public.upsert_auction_images(uuid, jsonb) to authenticated;
