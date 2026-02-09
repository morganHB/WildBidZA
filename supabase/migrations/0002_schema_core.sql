-- Enums
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.seller_status as enum ('none', 'approved');
create type public.auction_status as enum ('upcoming', 'live', 'ended');
create type public.notification_type as enum ('outbid', 'won_auction', 'approval_changed', 'seller_status_changed');

-- Core profile table linked to auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  province text,
  approval_status public.approval_status not null default 'pending',
  seller_status public.seller_status not null default 'none',
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.animal_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  category_id uuid not null,
  title text not null,
  description text not null,
  breed_type text,
  sex text,
  age text,
  weight text,
  province text,
  city text,
  farm_name text,
  health_notes text,
  permit_reference text,
  collection_notes text,
  starting_bid numeric(12,2) not null,
  min_increment numeric(12,2) not null,
  reserve_price numeric(12,2),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status public.auction_status not null default 'upcoming',
  winner_user_id uuid,
  winning_bid_id uuid,
  is_active boolean not null default true,
  is_moderated boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint auctions_seller_id_fkey foreign key (seller_id) references public.profiles(id) on delete restrict,
  constraint auctions_category_id_fkey foreign key (category_id) references public.animal_categories(id) on delete restrict,
  constraint auctions_winner_user_id_fkey foreign key (winner_user_id) references public.profiles(id) on delete set null
);

create table public.auction_images (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint auction_images_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint auction_images_unique_path unique (storage_path)
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null,
  bidder_id uuid not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint bids_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint bids_bidder_id_fkey foreign key (bidder_id) references public.profiles(id) on delete restrict
);

alter table public.auctions
  add constraint auctions_winning_bid_id_fkey foreign key (winning_bid_id) references public.bids(id) on delete set null;

create table public.settings (
  id int primary key default 1,
  sniping_window_minutes int not null default 3,
  extension_minutes int not null default 2,
  default_min_increment numeric(12,2) not null default 100.00,
  max_images_per_auction int not null default 8,
  bidder_masking_enabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.favorites (
  user_id uuid not null,
  auction_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, auction_id),
  constraint favorites_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint favorites_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_log_actor_id_fkey foreign key (actor_id) references public.profiles(id) on delete set null
);

insert into public.settings (id) values (1)
on conflict (id) do nothing;
