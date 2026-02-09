import Link from "next/link";
import { CircleUserRound, Gavel, Heart, LayoutDashboard, List, MessageSquareMore, Shield } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { APP_NAME } from "@/lib/constants/app";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { Button } from "@/components/ui/button";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return children;
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const baseItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { href: "/my-bids", icon: Gavel, label: "My bids" },
    { href: "/deals", icon: MessageSquareMore, label: "Deal chats" },
    { href: "/watchlist", icon: Heart, label: "Watchlist" },
    { href: "/settings", icon: CircleUserRound, label: "Settings" },
  ];

  const sellerItems = [{ href: "/seller/listings", icon: List, label: "Seller listings" }];
  const adminItems = [{ href: "/admin", icon: Shield, label: "Admin" }];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-30 border-b border-brand-100/80 bg-white/75 backdrop-blur-xl dark:border-brand-900/40 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm font-semibold tracking-tight text-brand-800 dark:text-brand-200">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <form action="/api/auth/sign-out" method="post">
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {[...baseItems, ...(isApprovedSeller(profile) ? sellerItems : []), ...(isAdmin(profile) ? adminItems : [])].map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.href} asChild variant="ghost" className="w-full justify-start">
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
