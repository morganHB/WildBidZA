export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SellerStatus = "none" | "approved";
export type RoleGroup = "user" | "marketer";
export type AuctionStatus = "upcoming" | "live" | "ended";
export type BidPricingMode = "lot_total" | "per_head";
export type LivestreamSignalType = "offer" | "answer" | "ice_candidate" | "leave";

export type NotificationType =
  | "outbid"
  | "won_auction"
  | "approval_changed"
  | "seller_status_changed"
  | "watchlist_closing_soon"
  | "watched_auction_live"
  | "deal_message";

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  created_at: string;
  read_at: string | null;
};

export type AuctionManager = {
  auction_id: string;
  manager_user_id: string;
  invited_by_user_id: string;
  can_edit: boolean;
  can_stream: boolean;
  created_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    email: string | null;
    role_group: RoleGroup;
    is_admin: boolean;
    approval_status: ApprovalStatus;
  } | null;
};

export type AuctionLivestreamSession = {
  id: string;
  auction_id: string;
  host_user_id: string;
  is_live: boolean;
  started_at: string;
  ended_at: string | null;
  audio_enabled: boolean;
  max_viewers: number;
  created_at: string;
  updated_at: string;
  viewer_count?: number;
};

export type AuctionLivestreamAvailability = {
  has_active_stream: boolean;
  session: AuctionLivestreamSession | null;
  can_host: boolean;
  can_view: boolean;
};

export type AuctionListFilter = {
  q?: string;
  categoryId?: string;
  province?: string;
  status?: AuctionStatus | "all";
  minPrice?: number;
  maxPrice?: number;
  sort?: "ending_soon" | "newest" | "highest_price";
  limit?: number;
  offset?: number;
};

export type AuctionImageInput = {
  storage_path: string;
  sort_order: number;
};

export type AuctionVideoInput = {
  storage_path: string;
  sort_order: number;
  trim_start_seconds: number;
  trim_end_seconds?: number | null;
  muted: boolean;
};

export type CreateAuctionPayload = {
  title: string;
  description: string;
  category_id: string;
  animal_count: number;
  avg_weight_kg?: number | null;
  breed_type?: string | null;
  sex?: string | null;
  age?: string | null;
  weight?: string | null;
  province?: string | null;
  city?: string | null;
  farm_name?: string | null;
  health_notes?: string | null;
  permit_reference?: string | null;
  collection_notes?: string | null;
  starting_bid: number;
  min_increment?: number | null;
  reserve_price?: number | null;
  bid_pricing_mode?: BidPricingMode;
  duration_minutes: number;
  packet_series_id?: string | null;
  packet_sequence?: number | null;
  previous_packet_auction_id?: string | null;
  is_waiting_for_previous?: boolean;
  auto_start_next?: boolean;
  start_time: string;
  images: AuctionImageInput[];
  videos: AuctionVideoInput[];
};

export type UpdateAuctionPayload = Partial<CreateAuctionPayload> & {
  id: string;
  is_active?: boolean;
};
