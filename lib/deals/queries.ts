import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRelation =
  | {
      id: string;
      display_name: string | null;
    }
  | {
      id: string;
      display_name: string | null;
    }[]
  | null;

type AuctionRelation =
  | {
      id: string;
      title: string;
      status: "upcoming" | "live" | "ended";
      end_time: string;
    }
  | {
      id: string;
      title: string;
      status: "upcoming" | "live" | "ended";
      end_time: string;
    }[]
  | null;

function normalizeProfile(profile: ProfileRelation) {
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }

  return profile ?? null;
}

function normalizeAuction(auction: AuctionRelation) {
  if (Array.isArray(auction)) {
    return auction[0] ?? null;
  }

  return auction ?? null;
}

export type DealMessage = {
  id: string;
  conversation_id: string;
  auction_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
};

export type DealConversationSummary = {
  id: string;
  auction_id: string;
  auction_title: string;
  auction_status: "upcoming" | "live" | "ended";
  end_time: string;
  counterpart_name: string;
  role: "seller" | "winner";
  updated_at: string;
  last_message: DealMessage | null;
};

export type DealConversationDetail = {
  id: string;
  auction_id: string;
  auction_title: string;
  auction_status: "upcoming" | "live" | "ended";
  end_time: string;
  seller_id: string;
  winner_id: string;
  counterpart_name: string;
  role: "seller" | "winner";
  messages: DealMessage[];
};

type ConversationRow = {
  id: string;
  auction_id: string;
  seller_id: string;
  winner_id: string;
  updated_at: string;
  auction: AuctionRelation;
  seller: ProfileRelation;
  winner: ProfileRelation;
};

function mapMessageRow(row: {
  id: string;
  conversation_id: string;
  auction_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: ProfileRelation;
}): DealMessage {
  const sender = normalizeProfile(row.sender ?? null);
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    auction_id: row.auction_id,
    sender_id: row.sender_id,
    sender_name: sender?.display_name ?? "User",
    message: row.message,
    created_at: row.created_at,
  };
}

function mapSummaryRow(row: ConversationRow, userId: string, latestMessage: DealMessage | null): DealConversationSummary {
  const auction = normalizeAuction(row.auction);
  const seller = normalizeProfile(row.seller);
  const winner = normalizeProfile(row.winner);
  const role = row.seller_id === userId ? "seller" : "winner";
  const counterpart =
    role === "seller" ? (winner?.display_name ?? "Winning bidder") : (seller?.display_name ?? "Seller");

  return {
    id: row.id,
    auction_id: row.auction_id,
    auction_title: auction?.title ?? "Auction",
    auction_status: auction?.status ?? "ended",
    end_time: auction?.end_time ?? new Date(0).toISOString(),
    counterpart_name: counterpart,
    role,
    updated_at: row.updated_at,
    last_message: latestMessage,
  };
}

export async function getDealConversations(userId: string): Promise<DealConversationSummary[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("auction_conversations")
    .select(
      `
      id,
      auction_id,
      seller_id,
      winner_id,
      updated_at,
      auction:auctions!auction_conversations_auction_id_fkey(id,title,status,end_time),
      seller:profiles!auction_conversations_seller_id_fkey(id,display_name),
      winner:profiles!auction_conversations_winner_id_fkey(id,display_name)
    `,
    )
    .or(`seller_id.eq.${userId},winner_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ConversationRow[];
  if (!rows.length) {
    return [];
  }

  const conversationIds = rows.map((row) => row.id);
  const { data: latestRows, error: latestError } = await supabase
    .from("auction_messages")
    .select(
      `
      id,
      conversation_id,
      auction_id,
      sender_id,
      message,
      created_at,
      sender:profiles!auction_messages_sender_id_fkey(id,display_name)
    `,
    )
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (latestError) {
    throw new Error(latestError.message);
  }

  const latestByConversation = new Map<string, DealMessage>();
  for (const row of (latestRows ?? []) as {
    id: string;
    conversation_id: string;
    auction_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    sender: ProfileRelation;
  }[]) {
    if (!latestByConversation.has(row.conversation_id)) {
      latestByConversation.set(row.conversation_id, mapMessageRow(row));
    }
  }

  return rows.map((row) => mapSummaryRow(row, userId, latestByConversation.get(row.id) ?? null));
}

export async function getDealConversationByAuction(userId: string, auctionId: string): Promise<DealConversationDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("auction_conversations")
    .select(
      `
      id,
      auction_id,
      seller_id,
      winner_id,
      updated_at,
      auction:auctions!auction_conversations_auction_id_fkey(id,title,status,end_time),
      seller:profiles!auction_conversations_seller_id_fkey(id,display_name),
      winner:profiles!auction_conversations_winner_id_fkey(id,display_name)
    `,
    )
    .eq("auction_id", auctionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const conversation = data as ConversationRow;
  const auction = normalizeAuction(conversation.auction);
  const seller = normalizeProfile(conversation.seller);
  const winner = normalizeProfile(conversation.winner);

  const role = conversation.seller_id === userId ? "seller" : "winner";
  const counterpartName =
    role === "seller" ? (winner?.display_name ?? "Winning bidder") : (seller?.display_name ?? "Seller");

  const { data: messages, error: messagesError } = await supabase
    .from("auction_messages")
    .select(
      `
      id,
      conversation_id,
      auction_id,
      sender_id,
      message,
      created_at,
      sender:profiles!auction_messages_sender_id_fkey(id,display_name)
    `,
    )
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(500);

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const messageRows = (messages ?? []) as {
    id: string;
    conversation_id: string;
    auction_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    sender: ProfileRelation;
  }[];

  return {
    id: conversation.id,
    auction_id: conversation.auction_id,
    auction_title: auction?.title ?? "Auction",
    auction_status: auction?.status ?? "ended",
    end_time: auction?.end_time ?? new Date(0).toISOString(),
    seller_id: conversation.seller_id,
    winner_id: conversation.winner_id,
    counterpart_name: counterpartName,
    role,
    messages: messageRows.map((row) => mapMessageRow(row)),
  };
}
