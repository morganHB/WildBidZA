alter table public.auctions
  add column if not exists animal_count integer not null default 1,
  add column if not exists avg_weight_kg numeric(10,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auctions_animal_count_check'
      and conrelid = 'public.auctions'::regclass
  ) then
    alter table public.auctions
      add constraint auctions_animal_count_check
      check (animal_count >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auctions_avg_weight_kg_check'
      and conrelid = 'public.auctions'::regclass
  ) then
    alter table public.auctions
      add constraint auctions_avg_weight_kg_check
      check (avg_weight_kg is null or avg_weight_kg > 0);
  end if;
end $$;
