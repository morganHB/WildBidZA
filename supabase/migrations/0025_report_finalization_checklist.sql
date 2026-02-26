create table if not exists public.auction_report_finalizations (
  auction_id uuid primary key references public.auctions(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz null,
  completed_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_auction_report_finalizations_updated_at
before update on public.auction_report_finalizations
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.auction_report_finalizations enable row level security;

create policy "report finalizations visible to auction managers"
  on public.auction_report_finalizations
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and (
          a.seller_id = auth.uid()
          or exists (
            select 1
            from public.auction_managers m
            where m.auction_id = a.id
              and m.manager_user_id = auth.uid()
          )
        )
    )
  );

create policy "report finalizations writable by auction managers"
  on public.auction_report_finalizations
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and (
          a.seller_id = auth.uid()
          or exists (
            select 1
            from public.auction_managers m
            where m.auction_id = a.id
              and m.manager_user_id = auth.uid()
          )
        )
    )
  );

create policy "report finalizations updatable by auction managers"
  on public.auction_report_finalizations
  for update
  using (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and (
          a.seller_id = auth.uid()
          or exists (
            select 1
            from public.auction_managers m
            where m.auction_id = a.id
              and m.manager_user_id = auth.uid()
          )
        )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.auctions a
      where a.id = auction_id
        and (
          a.seller_id = auth.uid()
          or exists (
            select 1
            from public.auction_managers m
            where m.auction_id = a.id
              and m.manager_user_id = auth.uid()
          )
        )
    )
  );

grant select, insert, update on public.auction_report_finalizations to authenticated;
