do $$
begin
  alter type public.notification_type add value if not exists 'watchlist_closing_soon';
exception
  when duplicate_object then
    null;
end
$$;

do $$
begin
  alter type public.notification_type add value if not exists 'watched_auction_live';
exception
  when duplicate_object then
    null;
end
$$;

do $$
begin
  alter type public.notification_type add value if not exists 'deal_message';
exception
  when duplicate_object then
    null;
end
$$;

create index if not exists notifications_user_type_created_idx
  on public.notifications (user_id, type, created_at desc);

create index if not exists notifications_type_auction_payload_idx
  on public.notifications (type, ((payload->>'auction_id')));

create or replace function public.dispatch_watchlist_notifications(p_window_minutes int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window_minutes int := greatest(1, coalesce(p_window_minutes, 30));
  v_window interval := make_interval(mins => v_window_minutes);
  v_closing_inserted int := 0;
  v_live_inserted int := 0;
begin
  with closing_candidates as (
    select
      f.user_id,
      a.id as auction_id,
      a.title as auction_title,
      a.end_time
    from public.favorites f
    join public.auctions a
      on a.id = f.auction_id
    where a.is_active = true
      and a.is_moderated = false
      and a.status <> 'ended'
      and a.is_waiting_for_previous = false
      and a.start_time <= v_now
      and a.end_time > v_now
      and a.end_time <= (v_now + v_window)
  ),
  inserted as (
    insert into public.notifications (user_id, type, payload)
    select
      c.user_id,
      'watchlist_closing_soon'::public.notification_type,
      jsonb_build_object(
        'auction_id', c.auction_id,
        'auction_title', c.auction_title,
        'end_time', c.end_time,
        'target_path', format('/auctions/%s', c.auction_id::text),
        'created_at', v_now
      )
    from closing_candidates c
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = c.user_id
        and n.type = 'watchlist_closing_soon'
        and n.payload->>'auction_id' = c.auction_id::text
    )
    returning 1
  )
  select count(*) into v_closing_inserted
  from inserted;

  with live_candidates as (
    select
      f.user_id,
      a.id as auction_id,
      a.title as auction_title,
      a.start_time,
      a.end_time
    from public.favorites f
    join public.auctions a
      on a.id = f.auction_id
    where a.is_active = true
      and a.is_moderated = false
      and a.status <> 'ended'
      and a.is_waiting_for_previous = false
      and a.start_time <= v_now
      and a.end_time > v_now
  ),
  inserted as (
    insert into public.notifications (user_id, type, payload)
    select
      c.user_id,
      'watched_auction_live'::public.notification_type,
      jsonb_build_object(
        'auction_id', c.auction_id,
        'auction_title', c.auction_title,
        'start_time', c.start_time,
        'end_time', c.end_time,
        'target_path', format('/auctions/%s', c.auction_id::text),
        'created_at', v_now
      )
    from live_candidates c
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = c.user_id
        and n.type = 'watched_auction_live'
        and n.payload->>'auction_id' = c.auction_id::text
    )
    returning 1
  )
  select count(*) into v_live_inserted
  from inserted;

  return jsonb_build_object(
    'closing_inserted', v_closing_inserted,
    'live_inserted', v_live_inserted,
    'window_minutes', v_window_minutes,
    'generated_at', v_now
  );
end;
$$;

grant execute on function public.dispatch_watchlist_notifications(int) to service_role;

select cron.unschedule('wildbid_watchlist_notifications')
where exists (
  select 1
  from cron.job
  where jobname = 'wildbid_watchlist_notifications'
);

select cron.schedule(
  'wildbid_watchlist_notifications',
  '* * * * *',
  $$select public.dispatch_watchlist_notifications(30);$$
);
