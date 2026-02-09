import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/guard";
import { getDealConversations } from "@/lib/deals/queries";

export async function GET() {
  try {
    const { user } = await requireAuthContext();
    const deals = await getDealConversations(user.id);
    return NextResponse.json({ ok: true, data: deals });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch deals" },
      { status: 400 },
    );
  }
}
