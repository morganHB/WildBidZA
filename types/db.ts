import type {
  ApprovalStatus,
  AuctionStatus,
  BidPricingMode,
  LivestreamSignalType,
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
          id_number: string | null;
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
          id_number?: string | null;
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
          id_number?: string | null;
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
          bid_pricing_mode: BidPricingMode;
          duration_minutes: number;
          packet_series_id: string | null;
          packet_sequence: number | null;
          previous_packet_auction_id: string | null;
          is_waiting_for_previous: boolean;
          auto_start_next: boolean;
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
          bid_pricing_mode?: BidPricingMode;
          duration_minutes?: number;
          packet_series_id?: string | null;
          packet_sequence?: number | null;
          previous_packet_auction_id?: string | null;
          is_waiting_for_previous?: boolean;
          auto_start_next?: boolean;
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
          bid_pricing_mode?: BidPricingMode;
          duration_minutes?: number;
          packet_series_id?: string | null;
          packet_sequence?: number | null;
          previous_packet_auction_id?: string | null;
          is_waiting_for_previous?: boolean;
          auto_start_next?: boolean;
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
      auto_bid_limits: {
        Row: {
          auction_id: string;
          bidder_id: string;
          max_amount: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          auction_id: string;
          bidder_id: string;
          max_amount: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          max_amount?: number;
          is_active?: boolean;
          updated_at?: string;
        };
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
      auction_report_finalizations: {
        Row: {
          auction_id: string;
          is_completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          auction_id: string;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          updated_at?: string;
        };
      };
      auction_managers: {
        Row: {
          auction_id: string;
          manager_user_id: string;
          invited_by_user_id: string;
          can_edit: boolean;
          can_stream: boolean;
          created_at: string;
        };
        Insert: {
          auction_id: string;
          manager_user_id: string;
          invited_by_user_id: string;
          can_edit?: boolean;
          can_stream?: boolean;
          created_at?: string;
        };
        Update: {
          can_edit?: boolean;
          can_stream?: boolean;
        };
      };
      auction_livestream_sessions: {
        Row: {
          id: string;
          auction_id: string;
          host_user_id: string;
          is_live: boolean;
          started_at: string;
          ended_at: string | null;
          audio_enabled: boolean;
          max_viewers: number;
          mux_live_stream_id: string | null;
          mux_playback_id: string | null;
          mux_stream_key: string | null;
          mux_ingest_url: string | null;
          mux_latency_mode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          host_user_id: string;
          is_live?: boolean;
          started_at?: string;
          ended_at?: string | null;
          audio_enabled?: boolean;
          max_viewers?: number;
          mux_live_stream_id?: string | null;
          mux_playback_id?: string | null;
          mux_stream_key?: string | null;
          mux_ingest_url?: string | null;
          mux_latency_mode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          is_live?: boolean;
          started_at?: string;
          ended_at?: string | null;
          audio_enabled?: boolean;
          max_viewers?: number;
          mux_live_stream_id?: string | null;
          mux_playback_id?: string | null;
          mux_stream_key?: string | null;
          mux_ingest_url?: string | null;
          mux_latency_mode?: string | null;
          updated_at?: string;
        };
      };
      auction_livestream_viewers: {
        Row: {
          session_id: string;
          viewer_user_id: string;
          joined_at: string;
          last_seen: string;
          left_at: string | null;
        };
        Insert: {
          session_id: string;
          viewer_user_id: string;
          joined_at?: string;
          last_seen?: string;
          left_at?: string | null;
        };
        Update: {
          last_seen?: string;
          left_at?: string | null;
        };
      };
      auction_livestream_signals: {
        Row: {
          id: string;
          session_id: string;
          from_user_id: string;
          to_user_id: string;
          signal_type: LivestreamSignalType;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          from_user_id: string;
          to_user_id: string;
          signal_type: LivestreamSignalType;
          payload?: Json;
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
      activate_packet: {
        Args: {
          p_auction_id: string;
        };
        Returns: Json;
      };
      activate_next_packet_if_needed: {
        Args: {
          p_ended_auction_id: string;
        };
        Returns: string | null;
      };
      can_activate_packet: {
        Args: {
          p_auction_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      can_manage_auction: {
        Args: {
          p_auction_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      can_stream_auction: {
        Args: {
          p_auction_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      create_packet_series: {
        Args: {
          p_payload: Json;
        };
        Returns: Json;
      };
      start_livestream: {
        Args: {
          p_auction_id: string;
          p_audio_enabled: boolean;
          p_max_viewers?: number;
        };
        Returns: Json;
      };
      stop_livestream: {
        Args: {
          p_auction_id: string;
        };
        Returns: Json;
      };
      join_livestream: {
        Args: {
          p_auction_id: string;
        };
        Returns: Json;
      };
      touch_livestream_viewer: {
        Args: {
          p_session_id: string;
        };
        Returns: undefined;
      };
      leave_livestream: {
        Args: {
          p_session_id: string;
        };
        Returns: undefined;
      };
      publish_livestream_signal: {
        Args: {
          p_session_id: string;
          p_to_user_id: string;
          p_signal_type: LivestreamSignalType;
          p_payload: Json;
        };
        Returns: string;
      };
      cleanup_livestream_signals: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_stale_livestream_viewers: {
        Args: Record<PropertyKey, never>;
        Returns: number;
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
      bid_pricing_mode: BidPricingMode;
      livestream_signal_type: LivestreamSignalType;
      notification_type: NotificationType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
