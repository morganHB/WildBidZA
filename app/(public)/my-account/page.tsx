import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3, Gavel, ShieldCheck } from "lucide-react";
import { getMyBids, getWatchlist } from "@/lib/auctions/queries";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyAccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/my-account");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    redirect("/sign-in?next=/my-account");
  }

  if (isAdmin(profile) || isApprovedSeller(profile)) {
    redirect("/dashboard");
  }

  const [myBids, watchlist] = await Promise.all([getMyBids(user.id), getWatchlist(user.id)]);

  return (
    <main className="animate-in min-h-screen bg-white pb-28">
      <section className="relative overflow-hidden px-6 pb-20 pt-28">
        <div className="pointer-events-none absolute right-8 top-16 text-[10rem] font-black uppercase italic tracking-tighter text-stone-100 md:text-[18rem]">
          BIDDER
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-[2px] w-12 bg-red-700" />
            <span className="text-xs font-black uppercase tracking-[0.38em] text-red-700">My Account</span>
          </div>
          <h1 className="mb-6 text-5xl font-black uppercase italic leading-[0.85] tracking-tighter text-stone-900 md:text-8xl">
            Bidder <span className="text-red-700">Hub.</span>
          </h1>
          <p className="max-w-3xl text-xl font-medium leading-relaxed text-stone-600">
            This area keeps bidder tools inside the public site style. Use Live Now to place bids and track your
            activity from here.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-6 md:grid-cols-3">
          <article className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-700">My Bids</p>
            <p className="mt-4 text-5xl font-black italic tracking-tighter text-stone-900">{myBids.length}</p>
            <Link
              href="/my-bids"
              className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-stone-700 transition hover:text-red-700"
            >
              <Gavel className="h-4 w-4" />
              Open bid history
            </Link>
          </article>

          <article className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-700">Watchlist</p>
            <p className="mt-4 text-5xl font-black italic tracking-tighter text-stone-900">{watchlist.length}</p>
            <Link
              href="/watchlist"
              className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-stone-700 transition hover:text-red-700"
            >
              <Clock3 className="h-4 w-4" />
              Open watchlist
            </Link>
          </article>

          <article className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-700">Verification</p>
            <p className="mt-4 text-3xl font-black uppercase tracking-tight text-stone-900">
              {profile.approval_status}
            </p>
            <Link
              href="/settings"
              className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-stone-700 transition hover:text-red-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Update profile
            </Link>
          </article>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto w-full max-w-7xl rounded-[2.5rem] border border-stone-200 bg-white p-10 shadow-sm md:p-12">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-red-700">Live Bidding</p>
          <h2 className="mt-4 text-4xl font-black uppercase italic tracking-tighter text-stone-900 md:text-6xl">
            Ready to bid?
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-stone-600">
            Enter the live auction stream and place your bids in real time.
          </p>
          <Link
            href="/auctions/live"
            className="mt-8 inline-flex items-center gap-3 rounded-xl bg-red-700 px-6 py-3 text-xs font-black uppercase tracking-[0.26em] text-white transition hover:bg-stone-900"
          >
            Go To Live Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
