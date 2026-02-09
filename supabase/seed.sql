-- Seed categories
insert into public.animal_categories (name, description)
values
  ('Cattle', 'Beef and dairy cattle listings'),
  ('Sheep', 'Stud and commercial sheep listings'),
  ('Goats', 'Boer and dairy goats'),
  ('Buffalo', 'Cape buffalo and managed game stock'),
  ('Antelope', 'Commercial antelope game listings'),
  ('Horses', 'Equine livestock and breeding stock')
on conflict (name) do nothing;

-- Ensure settings baseline
insert into public.settings (
  id,
  sniping_window_minutes,
  extension_minutes,
  default_min_increment,
  max_images_per_auction,
  bidder_masking_enabled
)
values (1, 3, 2, 100.00, 8, false)
on conflict (id) do update
set sniping_window_minutes = excluded.sniping_window_minutes,
    extension_minutes = excluded.extension_minutes,
    default_min_increment = excluded.default_min_increment,
    max_images_per_auction = excluded.max_images_per_auction,
    bidder_masking_enabled = excluded.bidder_masking_enabled;
