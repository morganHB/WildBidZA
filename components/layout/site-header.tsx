import Link from "next/link";
import Image from "next/image";
import { CircleUserRound, LayoutDashboard, Menu, X } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { APP_NAME } from "@/lib/constants/app";
import { getUnreadNotificationCount } from "@/lib/notifications/service";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/safety", label: "Safety" },
  { href: "/auctions", label: "Auctions" },
  { href: "/kraal-bookings", label: "Kraal Bookings" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [unreadCount, profile] = user
    ? await Promise.all([
        getUnreadNotificationCount(user.id).catch(() => 0),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => data),
      ])
    : [0, null];

  const showDashboard = Boolean(profile && (isAdmin(profile) || isApprovedSeller(profile)));
  const accountHref = showDashboard ? "/dashboard" : "/my-account";
  const accountLabel = showDashboard ? "Dashboard" : "My Account";

  return (
    <header className="sticky top-0 z-50 px-4 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl rounded-2xl border border-stone-200/80 bg-white/85 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative h-10 w-10 overflow-hidden rounded-xl border border-stone-300/70 bg-white">
              <Image src="/noordkaap_logo_transparent.png" alt="Noordkaap logo" fill sizes="40px" className="object-contain p-1" />
            </span>
            <span className="text-lg font-black uppercase italic tracking-tight text-stone-900 sm:text-xl">
              {APP_NAME.split(" ")[0]}
              <span className="text-red-700">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-600 transition-colors hover:text-red-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <>
                <NotificationBell userId={user.id} initialUnreadCount={unreadCount} />
                <Button asChild size="sm" variant="outline" className="rounded-xl border-stone-300 px-4">
                  <Link href={accountHref}>
                    {showDashboard ? <LayoutDashboard className="mr-2 h-4 w-4" /> : <CircleUserRound className="mr-2 h-4 w-4" />}
                    {accountLabel}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl bg-red-700 px-5 text-white hover:bg-stone-900"
                >
                  <Link href="/auctions/live">Live Now</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-xl text-stone-700 hover:text-red-700">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl bg-red-700 px-5 text-white hover:bg-stone-900"
                >
                  <Link href="/auctions/live">Live Now</Link>
                </Button>
              </>
            )}
          </div>

          <details className="group relative lg:hidden">
            <summary className="flex list-none cursor-pointer items-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 marker:content-none">
              <Menu className="h-4 w-4 group-open:hidden" />
              <X className="hidden h-4 w-4 group-open:block" />
            </summary>
            <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl">
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-700 transition hover:bg-stone-100 hover:text-red-700"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/auctions/live"
                  className="mt-1 rounded-xl bg-red-700 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white"
                >
                  Live Now
                </Link>
                {user ? (
                  <Link
                    href={accountHref}
                    className="rounded-xl border border-stone-300 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-stone-800"
                  >
                    {accountLabel}
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    className="rounded-xl border border-stone-300 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-stone-800"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
