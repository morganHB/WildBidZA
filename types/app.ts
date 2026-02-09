export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SellerStatus = "none" | "approved";
export type AuctionStatus = "upcoming" | "live" | "ended";

export type NotificationType =
  | "outbid"
  | "won_auction"
  | "approval_changed"
  | "seller_status_changed";

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
  start_time: string;
  end_time: string;
  images: AuctionImageInput[];
};

export type UpdateAuctionPayload = Partial<CreateAuctionPayload> & {
  id: string;
  is_active?: boolean;
};
