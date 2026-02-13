import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuctionListFilter } from "@/types/app";
import type { Database } from "@/types/db";

export type AuctionRow = Database["public"]["Tables"]["auctions"]["Row"];

type AuctionSummary = AuctionRow & {
  category: { id: string; name: string } | null;
  seller: { id: string; display_name: string | null } | null;
  images: { storage_path: string; sort_order: number }[];
  videos: {
    storage_path: string;
    sort_order: number;
    trim_start_seconds: number;
    trim_end_seconds: number | null;
    muted: boolean;
  }[];
  current_price: number;
  is_favorited: boolean;
  has_active_stream: boolean;
};

function deriveStatus(row: AuctionRow, nowIso: string) {
  if (row.status === "ended") {
    return "ended" as const;
  }

  if (row.is_waiting_for_previous) {
    return "upcoming" as const;
  }

  const now = new Date(nowIso).getTime();
  const start = new Date(row.start_time).getTime();
  const end = new Date(row.end_time).getTime();

  if (now < start) {
    return "upcoming" as const;
  }

  if (now >= end) {
    return "ended" as const;
  }

  return "live" as const;
}

export async function getSiteSettings() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getActiveCategories() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("animal_categories")
    .select("id,name,description,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getAuctions(filters: AuctionListFilter, userId?: string | null) {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("auctions")
    .select(
      `
      *,
      category:animal_categories(id,name),
      seller:profiles!auctions_seller_id_fkey(id,display_name),
      images:auction_images(storage_path,sort_order),
      videos:auction_videos(storage_path,sort_order,trim_start_seconds,trim_end_seconds,muted)
    `,
    )
    .eq("is_active", true)
    .eq("is_moderated", false)
    .order("created_at", { ascending: false });

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.province) {
    query = query.eq("province", filters.province);
  }

  if (typeof filters.minPrice === "number") {
    query = query.gte("starting_bid", filters.minPrice);
  }

  if (typeof filters.maxPrice === "number") {
    query = query.lte("starting_bid", filters.maxPrice);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 24) - 1);
  }

  if (filters.sort === "ending_soon") {
    query = query.order("end_time", { ascending: true });
  }

  if (filters.sort === "highest_price") {
    query = query.order("starting_bid", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rawAuctions = (data ?? []) as (AuctionRow & {
    category: { id: string; name: string } | null;
    seller: { id: string; display_name: string | null } | null;
    images: { storage_path: string; sort_order: number }[];
    videos: {
      storage_path: string;
      sort_order: number;
      trim_start_seconds: number;
      trim_end_seconds: number | null;
      muted: boolean;
    }[];
  })[];

  const filteredByStatus =
    filters.status && filters.status !== "all"
      ? rawAuctions.filter((row) => deriveStatus(row, nowIso) === filters.status)
      : rawAuctions;

  const auctionIds = filteredByStatus.map((row) => row.id);

  const highestByAuction = new Map<string, number>();
  const liveStreamAuctionIds = new Set<string>();

  if (auctionIds.length > 0) {
    const { data: bids, error: bidError } = await supabase
      .from("bids")
      .select("auction_id,amount")
      .in("auction_id", auctionIds)
      .order("amount", { ascending: false });

    if (bidError) {
      throw new Error(bidError.message);
    }

    for (const bid of bids ?? []) {
      if (!highestByAuction.has(bid.auction_id)) {
        highestByAuction.set(bid.auction_id, bid.amount);
      }
    }

    try {
      const streamClient = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? (createSupabaseAdminClient() as any)
        : supabase;
      const { data: activeStreams, error: streamError } = await streamClient
        .from("auction_livestream_sessions")
        .select("auction_id")
        .in("auction_id", auctionIds)
        .eq("is_live", true)
        .is("ended_at", null);

      if (streamError) {
        throw streamError;
      }

      for (const stream of activeStreams ?? []) {
        liveStreamAuctionIds.add(stream.auction_id);
      }
    } catch {
      // Livestream badge is optional metadata for list cards; avoid failing page loads.
    }
  }

  let favorites = new Set<string>();

  if (userId && auctionIds.length > 0) {
    const { data: favoriteRows } = await supabase
      .from("favorites")
      .select("auction_id")
      .eq("user_id", userId)
      .in("auction_id", auctionIds);

    favorites = new Set((favoriteRows ?? []).map((row) => row.auction_id));
  }

  return filteredByStatus.map((row) => ({
    ...row,
    status: deriveStatus(row, nowIso),
    current_price: highestByAuction.get(row.id) ?? row.starting_bid,
    is_favorited: favorites.has(row.id),
    has_active_stream: liveStreamAuctionIds.has(row.id),
    images: [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    videos: [...(row.videos ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  })) satisfies AuctionSummary[];
}

export async function getAuctionById(auctionId: string, userId?: string | null) {
  const supabase = await createSupabaseServerClient();

  const { data: auction, error } = await supabase
    .from("auctions")
    .select(
      `
      *,
      category:animal_categories(id,name,description),
      seller:profiles!auctions_seller_id_fkey(id,display_name),
      images:auction_images(id,storage_path,sort_order,created_at),
      videos:auction_videos(id,storage_path,sort_order,trim_start_seconds,trim_end_seconds,muted,created_at)
    `,
    )
    .eq("id", auctionId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: bids, error: bidError } = await supabase
    .from("bids")
    .select(
      `
      id,
      amount,
      created_at,
      bidder_id,
      profile:profiles!bids_bidder_id_fkey(display_name)
    `,
    )
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (bidError) {
    throw new Error(bidError.message);
  }

  let isFavorited = false;
  let canManage = false;
  let canStream = false;
  let myAutoBidMax: number | null = null;
  let activeLivestream: {
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
  } | null = null;

  if (userId) {
    const { data: favoriteRow } = await supabase
      .from("favorites")
      .select("auction_id")
      .eq("auction_id", auctionId)
      .eq("user_id", userId)
      .maybeSingle();

    isFavorited = Boolean(favoriteRow);

    const [
      { data: canManageData, error: canManageError },
      { data: canStreamData, error: canStreamError },
      { data: liveSession, error: liveSessionError },
      { data: autoBidRow, error: autoBidError },
    ] = await Promise.all([
      supabase.rpc("can_manage_auction", {
        p_auction_id: auctionId,
        p_user_id: userId,
      }),
      supabase.rpc("can_stream_auction", {
        p_auction_id: auctionId,
        p_user_id: userId,
      }),
      supabase
        .from("auction_livestream_sessions")
        .select("id,auction_id,host_user_id,is_live,started_at,ended_at,audio_enabled,max_viewers,created_at,updated_at")
        .eq("auction_id", auctionId)
        .eq("is_live", true)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("auto_bid_limits")
        .select("max_amount,is_active")
        .eq("auction_id", auctionId)
        .eq("bidder_id", userId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (canManageError) {
      throw new Error(canManageError.message);
    }

    if (canStreamError) {
      throw new Error(canStreamError.message);
    }

    if (liveSessionError) {
      throw new Error(liveSessionError.message);
    }

    if (autoBidError) {
      throw new Error(autoBidError.message);
    }

    canManage = Boolean(canManageData);
    canStream = Boolean(canStreamData);
    activeLivestream = (liveSession ?? null) as typeof activeLivestream;
    myAutoBidMax = autoBidRow?.max_amount ?? null;
  }

  const highestBid = (bids ?? []).reduce((acc, row) => Math.max(acc, row.amount), auction.starting_bid);

  return {
    ...auction,
    status: deriveStatus(auction as AuctionRow, new Date().toISOString()),
    current_price: highestBid,
    bid_count: bids?.length ?? 0,
    bids:
      bids?.map((bid) => {
        const profile = Array.isArray(bid.profile) ? bid.profile[0] : bid.profile;

        return {
          ...bid,
          bidder_name: (profile as { display_name: string | null } | null)?.display_name ?? "Bidder",
        };
      }) ?? [],
    is_favorited: isFavorited,
    images: [
      ...((auction.images as { id: string; storage_path: string; sort_order: number; created_at: string }[]) ?? []),
    ].sort((a, b) => a.sort_order - b.sort_order),
    videos: [
      ...((auction.videos as {
        id: string;
        storage_path: string;
        sort_order: number;
        trim_start_seconds: number;
        trim_end_seconds: number | null;
        muted: boolean;
        created_at: string;
      }[]) ?? []),
    ].sort((a, b) => a.sort_order - b.sort_order),
    can_manage: canManage,
    can_stream: canStream,
    active_livestream: activeLivestream,
    my_auto_bid_max: myAutoBidMax,
  };
}

export async function getMyBids(userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bids")
    .select(
      `
      id,
      amount,
      created_at,
      auction:auctions!bids_auction_id_fkey(
        id,
        title,
        end_time,
        start_time,
        status,
        winner_user_id,
        starting_bid
      )
    `,
    )
    .eq("bidder_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getWatchlist(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("favorites")
    .select(
      `
      created_at,
      auction:auctions(
        id,
        title,
        status,
        start_time,
        end_time,
        starting_bid,
        images:auction_images(storage_path,sort_order),
        videos:auction_videos(storage_path,sort_order,trim_start_seconds,trim_end_seconds,muted)
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getSellerListings(sellerId: string) {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("auctions")
    .select(
      `
      *,
      category:animal_categories(name),
      images:auction_images(storage_path,sort_order),
      videos:auction_videos(storage_path,sort_order,trim_start_seconds,trim_end_seconds,muted),
      bids:bids!bids_auction_id_fkey(amount)
    `,
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const bids = (row.bids as { amount: number }[] | null) ?? [];
    const current_price = bids.reduce((acc, bid) => Math.max(acc, bid.amount), row.starting_bid);

    return {
      ...row,
      status: deriveStatus(row as AuctionRow, nowIso),
      bids,
      current_price,
      images: [...((row.images as { storage_path: string; sort_order: number }[]) ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
      videos: [
        ...((row.videos as {
          storage_path: string;
          sort_order: number;
          trim_start_seconds: number;
          trim_end_seconds: number | null;
          muted: boolean;
        }[]) ?? []),
      ].sort((a, b) => a.sort_order - b.sort_order),
    };
  });
}

export async function getManagedListings(userId: string) {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("auction_managers")
    .select(
      `
      can_edit,
      can_stream,
      auction:auctions(
        *,
        seller:profiles!auctions_seller_id_fkey(id,display_name),
        category:animal_categories(name),
        images:auction_images(storage_path,sort_order),
        videos:auction_videos(storage_path,sort_order,trim_start_seconds,trim_end_seconds,muted),
        bids:bids!bids_auction_id_fkey(amount)
      )
    `,
    )
    .eq("manager_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => {
      const auction = (Array.isArray(row.auction) ? row.auction[0] : row.auction) as
        | (AuctionRow & {
            seller: { id: string; display_name: string | null } | null;
            category: { name: string } | null;
            images: { storage_path: string; sort_order: number }[] | null;
            videos:
              | {
                  storage_path: string;
                  sort_order: number;
                  trim_start_seconds: number;
                  trim_end_seconds: number | null;
                  muted: boolean;
                }[]
              | null;
            bids: { amount: number }[] | null;
          })
        | null;

      if (!auction) {
        return null;
      }

      const bids = auction.bids ?? [];
      const current_price = bids.reduce((acc, bid) => Math.max(acc, bid.amount), auction.starting_bid);

      return {
        ...auction,
        status: deriveStatus(auction, nowIso),
        bids,
        current_price,
        manager_can_edit: row.can_edit,
        manager_can_stream: row.can_stream,
        images: [...(auction.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        videos: [...(auction.videos ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      };
    })
    .filter(
      (
        item,
      ): item is AuctionRow & {
        seller: { id: string; display_name: string | null } | null;
        category: { name: string } | null;
        images: { storage_path: string; sort_order: number }[];
        videos: {
          storage_path: string;
          sort_order: number;
          trim_start_seconds: number;
          trim_end_seconds: number | null;
          muted: boolean;
        }[];
        bids: { amount: number }[];
        status: "upcoming" | "live" | "ended";
        current_price: number;
        manager_can_edit: boolean;
        manager_can_stream: boolean;
      } => item !== null,
    );
}

export async function getAdminOverview() {
  const supabase = await createSupabaseServerClient();

  const [{ count: pendingApprovals }, { count: liveAuctions }, { count: usersCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending"),
    supabase
      .from("auctions")
      .select("id", { count: "exact", head: true })
      .eq("status", "live")
      .eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return {
    pendingApprovals: pendingApprovals ?? 0,
    liveAuctions: liveAuctions ?? 0,
    usersCount: usersCount ?? 0,
  };
}

