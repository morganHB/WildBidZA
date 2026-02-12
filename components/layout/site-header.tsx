import Link from "next/link";
import { LayoutDashboard, PawPrint } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { APP_NAME } from "@/lib/constants/app";
import { getUnreadNotificationCount } from "@/lib/notifications/service";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";

const baseNavItems = [
  { href: "/auctions/live", label: "Live Auctions" },
  { href: "/auctions", label: "Categories" },
  { href: "/how-it-works", label: "How it works" },
];

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };
  const canSell = isApprovedSeller(profile) || isAdmin(profile);
  const unreadCount = user ? await getUnreadNotificationCount(user.id).catch(() => 0) : 0;
  const navItems = canSell
    ? [...baseNavItems, { href: "/seller/create", label: "Sell" }]
    : baseNavItems;

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/80 backdrop-blur-xl dark:border-emerald-900/30 dark:bg-slate-950/80">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-3 text-sm font-semibold tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-300/45 transition group-hover:scale-105">
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="text-2xl font-semibold text-slate-900 dark:text-white">{APP_NAME}</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ModeToggle />
          {user ? (
            <>
              <NotificationBell userId={user.id} initialUnreadCount={unreadCount} />
              <Button asChild size="sm" className="rounded-full px-5">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full text-slate-700 dark:text-slate-200">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-6">
                <Link href="/sign-up">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
