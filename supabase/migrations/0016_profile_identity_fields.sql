alter table public.profiles
  add column if not exists id_number text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_number_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_number_format
      check (id_number is null or id_number ~ '^[0-9]{13}$');
  end if;
end
$$;

create unique index if not exists profiles_id_number_unique
  on public.profiles (id_number)
  where id_number is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, phone, id_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '[^0-9+]', '', 'g'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'id_number', ''), '\s+', '', 'g'), '')
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      id_number = coalesce(public.profiles.id_number, excluded.id_number),
      updated_at = timezone('utc', now());

  return new;
end;
$$;
