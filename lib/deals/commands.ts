import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SendDealMessageInput } from "@/lib/validation/deal";

export async function sendDealMessage(userId: string, auctionId: string, payload: SendDealMessageInput) {
  const supabase = await createSupabaseServerClient();
  const message = payload.message.trim();

  const { data: conversation, error: conversationError } = await supabase
    .from("auction_conversations")
    .select("id")
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
