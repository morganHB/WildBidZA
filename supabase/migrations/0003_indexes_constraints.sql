-- Constraints
alter table public.auctions
  add constraint auctions_positive_starting_bid check (starting_bid > 0),
  add constraint auctions_positive_min_increment check (min_increment > 0),
  add constraint auctions_reserve_price_positive check (reserve_price is null or reserve_price > 0),
  add constraint auctions_end_after_start check (end_time > start_time),
  add constraint auctions_reserve_ge_start check (reserve_price is null or reserve_price >= starting_bid);

alter table public.bids
  add constraint bids_amount_positive check (amount > 0);

alter table public.settings
  add constraint settings_sniping_window_valid check (sniping_window_minutes between 0 and 60),
  add constraint settings_extension_valid check (extension_minutes between 0 and 60),
  add constraint settings_default_increment_positive check (default_min_increment > 0),
  add constraint settings_max_images_valid check (max_images_per_auction between 1 and 12);

-- Indexes
create index auctions_status_end_time_idx on public.auctions(status, end_time);
create index auctions_status_start_time_idx on public.auctions(status, start_time);
create index auctions_category_idx on public.auctions(category_id);
create index auctions_seller_idx on public.auctions(seller_id);
create index auctions_is_active_idx on public.auctions(is_active, is_moderated);
create index auctions_province_idx on public.auctions(province);
create index auctions_created_at_idx on public.auctions(created_at desc);

create index bids_auction_amount_idx on public.bids(auction_id, amount desc, created_at desc);
create index bids_bidder_idx on public.bids(bidder_id, created_at desc);
create index bids_created_idx on public.bids(created_at desc);

create index auction_images_auction_sort_idx on public.auction_images(auction_id, sort_order);
create index favorites_user_idx on public.favorites(user_id);
create index favorites_auction_idx on public.favorites(auction_id);
create index notifications_user_read_idx on public.notifications(user_id, read_at, created_at desc);
create index audit_log_created_idx on public.audit_log(created_at desc);
