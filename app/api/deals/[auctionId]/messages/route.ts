import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/guard";
import { sendDealMessage } from "@/lib/deals/commands";
import { getDealConversationByAuction } from "@/lib/deals/queries";
import { sendDealMessageSchema } from "@/lib/validation/deal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ auctionId: string }> },
) {
  try {
    const { user } = await requireAuthContext();
    const { auctionId } = await params;
    const conversation = await getDealConversationByAuction(user.id, auctionId);

    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: conversation });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load conversation" },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ auctionId: string }> },
) {
  try {
    const { user } = await requireAuthContext();
    const body = await request.json();
    const parsed = sendDealMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message payload" },
        { status: 400 },
      );
    }

    const { auctionId } = await params;
    const message = await sendDealMessage(user.id, auctionId, parsed.data);
    return NextResponse.json({ ok: true, data: message });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 400 },
    );
  }
}
