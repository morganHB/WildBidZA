import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guard";
import { getAdminOverview } from "@/lib/auctions/queries";

export default async function AdminPage() {
  await requireAdminPage();
  const overview = await getAdminOverview();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{overview.pendingApprovals}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live auctions</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{overview.liveAuctions}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total users</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{overview.usersCount}</CardContent>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Button asChild variant="outline"><Link href="/admin/approvals">Approvals queue</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/sellers">Seller permissions</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/categories">Categories</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/auctions">Auction moderation</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/settings">Site settings</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/audit">Audit log</Link></Button>
      </div>
    </div>
  );
}
