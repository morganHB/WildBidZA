import Link from "next/link";
import { Clock3, Gavel, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAuthPage } from "@/lib/auth/guard";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { getMyBids, getWatchlist } from "@/lib/auctions/queries";
import { APP_NAME } from "@/lib/constants/app";

export default async function DashboardPage() {
  const { user, profile } = await requireAuthPage();
  const buyerOnly = !isApprovedSeller(profile) && !isAdmin(profile);

  const [myBids, watchlist] = await Promise.all([getMyBids(user.id), getWatchlist(user.id)]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {profile.display_name ?? "Bidder"}</CardTitle>
          <CardDescription>Your account status and recent activity on {APP_NAME}.</CardDescription>
        </CardHeader>
        <CardContent className={`grid gap-4 ${buyerOnly ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500">Approval status</p>
            <p className="mt-2 text-lg font-semibold capitalize">{profile.approval_status}</p>
            {profile.approval_status !== "approved" ? (
              <p className="mt-1 text-xs text-slate-500">Your account is pending manual verification by an admin.</p>
            ) : null}
          </div>
          {buyerOnly ? (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500">Account type</p>
              <p className="mt-2 text-lg font-semibold">Buyer</p>
              <p className="mt-1 text-xs text-slate-500">Clean bidder workspace with auctions, bids, and watchlist.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500">Role group</p>
              <p className="mt-2 text-lg font-semibold capitalize">{profile.role_group}</p>
              <p className="mt-1 text-xs text-slate-500">Marketers can buy and sell. Admins manage the platform.</p>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-2 text-lg font-semibold">{profile.is_admin ? "Admin" : "User"}</p>
            <p className="mt-1 text-xs text-slate-500">Account created {new Date(profile.created_at).toLocaleDateString("en-ZA")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My bids</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{myBids.length}</p>
            <Button asChild variant="ghost" size="sm" className="mt-2 px-0">
              <Link href="/my-bids">
                <Gavel className="mr-2 h-4 w-4" />View bids
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{watchlist.length}</p>
            <Button asChild variant="ghost" size="sm" className="mt-2 px-0">
              <Link href="/watchlist">
                <Clock3 className="mr-2 h-4 w-4" />View watchlist
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {profile.approval_status === "approved"
                ? "You can place bids on live auctions."
                : "Bidding unlocks after admin approval."}
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-2 px-0">
              <Link href="/settings">
                <ShieldCheck className="mr-2 h-4 w-4" />Update profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
