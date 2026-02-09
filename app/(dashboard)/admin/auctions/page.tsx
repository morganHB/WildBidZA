import { AuctionsModerationTable } from "@/components/admin/auctions-moderation-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminAuctionsPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("auctions")
    .select("id,title,status,is_active,is_moderated")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auction Moderation</CardTitle>
      </CardHeader>
      <CardContent>
        <AuctionsModerationTable rows={(data ?? []) as any} />
      </CardContent>
    </Card>
  );
}
