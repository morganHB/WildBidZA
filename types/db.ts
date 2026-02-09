import type {
  ApprovalStatus,
  AuctionStatus,
  NotificationType,
  RoleGroup,
  SellerStatus,
} from "@/types/app";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          email: string | null;
          phone: string | null;
          province: string | null;
          approval_status: ApprovalStatus;
          seller_status: SellerStatus;
          role_group: RoleGroup;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          email?: string | null;
          phone?: string | null;
          province?: string | null;
          approval_status?: ApprovalStatus;
          seller_status?: SellerStatus;
          role_group?: RoleGroup;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          email?: string | null;
          phone?: string | null;
          province?: string | null;
          approval_status?: ApprovalStatus;
          seller_status?: SellerStatus;
          role_group?: RoleGroup;
          is_admin?: boolean;
          updated_at?: string;
        };
      };
      animal_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_active?: boolean;
        };
      };
      auctions: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string;
          title: string;
          description: string;
          animal_count: number;
          avg_weight_kg: number | null;
          breed_type: string | null;
          sex: string | null;
          age: string | null;
          weight: string | null;
          province: string | null;
          city: string | null;
          farm_name: string | null;
          health_notes: string | null;
          permit_reference: string | null;
          collection_notes: string | null;
          starting_bid: number;
          min_increment: number;
          reserve_price: number | null;
          start_time: string;
          end_time: string;
          status: AuctionStatus;
          winner_user_id: string | null;
          winning_bid_id: string | null;
          is_active: boolean;
          is_moderated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          category_id: string;
          title: string;
          description: string;
          animal_count?: number;
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
          min_increment?: number;
          reserve_price?: number | null;
          start_time: string;
          end_time: string;
          status?: AuctionStatus;
          winner_user_id?: string | null;
          winning_bid_id?: string | null;
          is_active?: boolean;
          is_moderated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          title?: string;
          description?: string;
          animal_count?: number;
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
          starting_bid?: number;
          min_increment?: number;
          reserve_price?: number | null;
          start_time?: string;
          end_time?: string;
          status?: AuctionStatus;
          winner_user_id?: string | null;
          winning_bid_id?: string | null;
          is_active?: boolean;
          is_moderated?: boolean;
          updated_at?: string;
        };
      };
      auction_images: {
        Row: {
          id: string;
          auction_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          storage_path: string;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          sort_order?: number;
        };
      };
      auction_videos: {
        Row: {
          id: string;
          auction_id: string;
          storage_path: string;
          sort_order: number;
          trim_start_seconds: number;
          trim_end_seconds: number | null;
          muted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          storage_path: string;
          sort_order: number;
          trim_start_seconds?: number;
          trim_end_seconds?: number | null;
          muted?: boolean;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          sort_order?: number;
          trim_start_seconds?: number;
          trim_end_seconds?: number | null;
          muted?: boolean;
        };
      };
      bids: {
        Row: {
          id: string;
          auction_id: string;
          bidder_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          bidder_id: string;
          amount: number;
          created_at?: string;
        };
        Update: never;
      };
      auction_conversations: {
        Row: {
          id: string;
          auction_id: string;
          seller_id: string;
          winner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          seller_id: string;
          winner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          seller_id?: string;
          winner_id?: string;
          updated_at?: string;
        };
      };
      auction_messages: {
        Row: {
          id: string;
          conversation_id: string;
          auction_id: string;
          sender_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          auction_id: string;
          sender_id: string;
          message: string;
          created_at?: string;
        };
        Update: never;
      };
      settings: {
        Row: {
          id: number;
          sniping_window_minutes: number;
          extension_minutes: number;
          default_min_increment: number;
          max_images_per_auction: number;
          bidder_masking_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: number;
          sniping_window_minutes?: number;
          extension_minutes?: number;
          default_min_increment?: number;
          max_images_per_auction?: number;
          bidder_masking_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          sniping_window_minutes?: number;
          extension_minutes?: number;
          default_min_increment?: number;
          max_images_per_auction?: number;
          bidder_masking_enabled?: boolean;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          user_id: string;
          auction_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          auction_id: string;
          created_at?: string;
        };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          payload?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      place_bid: {
        Args: {
          p_auction_id: string;
          p_amount: number;
        };
        Returns: Json;
      };
      finalize_ended_auctions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      upsert_auction_images: {
        Args: {
          p_auction_id: string;
          p_images: Json;
        };
        Returns: undefined;
      };
      upsert_auction_videos: {
        Args: {
          p_auction_id: string;
          p_videos: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      approval_status: ApprovalStatus;
      seller_status: SellerStatus;
      role_group: RoleGroup;
      auction_status: AuctionStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
