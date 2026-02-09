create table public.auction_conversations (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique,
  seller_id uuid not null,
  winner_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint auction_conversations_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint auction_conversations_seller_id_fkey foreign key (seller_id) references public.profiles(id) on delete cascade,
  constraint auction_conversations_winner_id_fkey foreign key (winner_id) references public.profiles(id) on delete cascade,
  constraint auction_conversations_participants_check check (seller_id <> winner_id)
);

create table public.auction_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  auction_id uuid not null,
  sender_id uuid not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint auction_messages_conversation_id_fkey foreign key (conversation_id) references public.auction_conversations(id) on delete cascade,
  constraint auction_messages_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint auction_messages_sender_id_fkey foreign key (sender_id) references public.profiles(id) on delete cascade,
  constraint auction_messages_message_check check (char_length(btrim(message)) between 1 and 2000)
);

create index auction_conversations_seller_updated_idx
  on public.auction_conversations(seller_id, updated_at desc);

create index auction_conversations_winner_updated_idx
  on public.auction_conversations(winner_id, updated_at desc);

create index auction_messages_conversation_created_idx
  on public.auction_messages(conversation_id, created_at asc);

create index auction_messages_auction_created_idx
  on public.auction_messages(auction_id, created_at asc);

create or replace function public.touch_auction_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.auction_conversations
  set updated_at = timezone('utc', now())
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists auction_messages_touch_conversation on public.auction_messages;

create trigger auction_messages_touch_conversation
after insert on public.auction_messages
for each row
execute function public.touch_auction_conversation();

alter table public.auction_conversations enable row level security;
alter table public.auction_messages enable row level security;

create policy "participants can read auction conversations"
  on public.auction_conversations
  for select
  using (
    public.is_admin()
    or auth.uid() = seller_id
    or auth.uid() = winner_id
  );

create policy "participants can create ended auction conversations"
  on public.auction_conversations
  for insert
  with check (
    public.is_admin()
    or (
      auth.uid() is not null
      and (auth.uid() = seller_id or auth.uid() = winner_id)
      and exists (
        select 1
        from public.auctions a
        where a.id = auction_id
          and a.status = 'ended'
          and a.winner_user_id is not null
          and a.seller_id = seller_id
          and a.winner_user_id = winner_id
      )
    )
  );

create policy "admins can update auction conversations"
  on public.auction_conversations
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete auction conversations"
  on public.auction_conversations
  for delete
  using (public.is_admin());

create policy "participants can read auction messages"
  on public.auction_messages
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.auction_conversations c
      where c.id = conversation_id
        and (c.seller_id = auth.uid() or c.winner_id = auth.uid())
    )
  );

create policy "participants can send auction messages"
  on public.auction_messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.auction_conversations c
      where c.id = conversation_id
        and c.auction_id = auction_id
        and (c.seller_id = auth.uid() or c.winner_id = auth.uid())
    )
  );

grant select, insert on public.auction_conversations, public.auction_messages to authenticated;

insert into public.auction_conversations (auction_id, seller_id, winner_id, created_at, updated_at)
select a.id, a.seller_id, a.winner_user_id, a.updated_at, a.updated_at
from public.auctions a
where a.status = 'ended'
  and a.winner_user_id is not null
on conflict (auction_id) do nothing;

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

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
