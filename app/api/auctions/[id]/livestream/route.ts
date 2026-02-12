import { NextResponse } from "next/server";
import { joinLivestream } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireAuthContext();
    const { id } = await context.params;

    const [{ data: canHostData, error: canHostError }, { data: session, error: sessionError }] = await Promise.all([
      supabase.rpc("can_stream_auction", {
        p_auction_id: id,
        p_user_id: user.id,
      }),
      supabase
        .from("auction_livestream_sessions")
        .select("id,auction_id,host_user_id,is_live,started_at,ended_at,audio_enabled,max_viewers,created_at,updated_at")
        .eq("auction_id", id)
        .eq("is_live", true)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (canHostError) {
      throw canHostError;
    }

    if (sessionError) {
      throw sessionError;
    }

    let viewerCount = 0;
    if (session?.id) {
      const threshold = new Date(Date.now() - 45_000).toISOString();
      const { count, error: countError } = await supabase
        .from("auction_livestream_viewers")
        .select("viewer_user_id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .is("left_at", null)
        .gte("last_seen", threshold);

      if (countError) {
        throw countError;
      }

      viewerCount = count ?? 0;
    }

    return NextResponse.json({
      ok: true,
      data: {
        has_active_stream: Boolean(session),
        can_view: true,
        can_host: Boolean(canHostData),
        session: session
          ? {
              ...session,
              viewer_count: viewerCount,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load livestream" },
      { status: 400 },
    );
  }
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthContext();
    const { id } = await context.params;

    const data = await joinLivestream(id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to join livestream" },
      { status: 400 },
    );
  }
}
