import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SendDealMessageInput } from "@/lib/validation/deal";

export async function sendDealMessage(userId: string, auctionId: string, payload: SendDealMessageInput) {
  const supabase = await createSupabaseServerClient();
  const message = payload.message.trim();

  const { data: conversation, error: conversationError } = await supabase
    .from("auction_conversations")
    .select(
      `
      id,
      seller_id,
      winner_id,
      auction:auctions!auction_conversations_auction_id_fkey(title)
    `,
    )
    .eq("auction_id", auctionId)
    .single();

  if (conversationError || !conversation) {
    throw new Error("Conversation is unavailable for this auction");
  }

  const { data, error } = await supabase
    .from("auction_messages")
    .insert({
      conversation_id: conversation.id,
      auction_id: auctionId,
      sender_id: userId,
      message,
    })
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
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to send message");
  }

  const sender = Array.isArray(data.sender) ? data.sender[0] : data.sender;
  const recipientId = conversation.seller_id === userId ? conversation.winner_id : conversation.seller_id;
  const auctionRelation = Array.isArray(conversation.auction) ? conversation.auction[0] : conversation.auction;
  const auctionTitle = auctionRelation?.title ?? "Auction";

  if (recipientId && recipientId !== userId) {
    try {
      const admin = createSupabaseAdminClient() as any;
      const throttleSince = new Date(Date.now() - 2 * 60_000).toISOString();

      const { data: recent, error: recentError } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", recipientId)
        .eq("type", "deal_message")
        .gte("created_at", throttleSince)
        .filter("payload->>auction_id", "eq", auctionId)
        .limit(1);

      if (recentError) {
        throw recentError;
      }

      if (!recent || recent.length === 0) {
        const { error: notifyError } = await admin.from("notifications").insert({
          user_id: recipientId,
          type: "deal_message",
          payload: {
            auction_id: auctionId,
            auction_title: auctionTitle,
            message_id: data.id,
            sender_name: sender?.display_name ?? "Participant",
            target_path: `/deals/${auctionId}`,
            created_at: new Date().toISOString(),
          },
        });

        if (notifyError) {
          throw notifyError;
        }
      }
    } catch (notifyError) {
      console.error("Failed to create deal message notification", notifyError);
    }
  }

  return {
    id: data.id,
    conversation_id: data.conversation_id,
    auction_id: data.auction_id,
    sender_id: data.sender_id,
    sender_name: sender?.display_name ?? "User",
    message: data.message,
    created_at: data.created_at,
  };
}
