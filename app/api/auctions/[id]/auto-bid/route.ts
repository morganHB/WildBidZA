import { NextResponse } from "next/server";
import { requireApprovedBidderContext, requireAuthContext } from "@/lib/auth/guard";
import { autoBidSchema } from "@/lib/validation/bid";

async function getRequiredMinimumBid(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>,
  auctionId: string,
  userId: string,
) {
  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select("id,seller_id,status,start_time,end_time,is_active,is_moderated,starting_bid,min_increment")
    .eq("id", auctionId)
    .single();

  if (auctionError || !auction) {
    throw new Error(auctionError?.message ?? "Auction not found");
  }

  if (!auction.is_active || auction.is_moderated) {
    throw new Error("Auction is unavailable");
  }

  if (auction.seller_id === userId) {
    throw new Error("You cannot set auto-bid on your own auction");
  }

  if (auction.status === "ended" || new Date().toISOString() >= auction.end_time) {
    throw new Error("Auction has ended");
  }

  const { data: highestBidRow, error: highestBidError } = await supabase
    .from("bids")
    .select("amount")
    .eq("auction_id", auctionId)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (highestBidError) {
    throw new Error(highestBidError.message);
  }

  const currentHighest =
    highestBidRow?.amount ?? Number(auction.starting_bid) - Number(auction.min_increment);
  const requiredMin = Math.max(
    Number(auction.starting_bid),
    currentHighest + Number(auction.min_increment),
  );

  return {
    auction,
    requiredMin,
    currentHighest: Math.max(currentHighest, Number(auction.starting_bid)),
  };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireAuthContext();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from("auto_bid_limits")
      .select("auction_id,bidder_id,max_amount,is_active,updated_at")
      .eq("auction_id", id)
      .eq("bidder_id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, data: data ?? null });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load auto-bid" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireApprovedBidderContext();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = autoBidSchema.safeParse({ max_amount: Number(body.max_amount) });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid auto-bid amount" },
        { status: 400 },
      );
    }

    const { requiredMin, currentHighest } = await getRequiredMinimumBid(supabase, id, user.id);
    if (parsed.data.max_amount < requiredMin) {
      return NextResponse.json(
        {
          ok: false,
          error: `Max auto-bid must be at least ${requiredMin.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("auto_bid_limits")
      .upsert(
        {
          auction_id: id,
          bidder_id: user.id,
          max_amount: parsed.data.max_amount,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auction_id,bidder_id" },
      )
      .select("auction_id,bidder_id,max_amount,is_active,updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        required_min: requiredMin,
        current_highest: currentHighest,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save auto-bid";
    const status = message.toLowerCase().includes("approved") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireAuthContext();
    const { id } = await context.params;

    const { error } = await supabase
      .from("auto_bid_limits")
      .delete()
      .eq("auction_id", id)
      .eq("bidder_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to disable auto-bid" },
      { status: 400 },
    );
  }
}
