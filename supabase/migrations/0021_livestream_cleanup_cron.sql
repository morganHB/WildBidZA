-- Livestream cleanup jobs

create or replace function public.cleanup_livestream_signals()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  delete from public.auction_livestream_signals
  where created_at < timezone('utc', now()) - interval '30 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.cleanup_stale_livestream_viewers()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  update public.auction_livestream_viewers v
  set left_at = coalesce(v.left_at, timezone('utc', now())),
      last_seen = timezone('utc', now())
  where v.left_at is null
    and (
      v.last_seen < timezone('utc', now()) - interval '45 seconds'
      or exists (
        select 1
        from public.auction_livestream_sessions s
        where s.id = v.session_id
          and (s.is_live = false or s.ended_at is not null)
      )
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.cleanup_livestream_signals() to service_role;
grant execute on function public.cleanup_stale_livestream_viewers() to service_role;

select cron.unschedule('wildbid_livestream_signal_cleanup')
where exists (
  select 1
  from cron.job
  where jobname = 'wildbid_livestream_signal_cleanup'
);

select cron.schedule(
  'wildbid_livestream_signal_cleanup',
  '*/5 * * * *',
  $$select public.cleanup_livestream_signals();$$
);

select cron.unschedule('wildbid_livestream_viewer_cleanup')
where exists (
  select 1
  from cron.job
  where jobname = 'wildbid_livestream_viewer_cleanup'
);

select cron.schedule(
  'wildbid_livestream_viewer_cleanup',
  '*/5 * * * *',
  $$select public.cleanup_stale_livestream_viewers();$$
);
