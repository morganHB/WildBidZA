import { SellerPermissionsTable } from "@/components/admin/seller-permissions-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminSellersPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,email,seller_status,approval_status")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        <SellerPermissionsTable rows={(data ?? []) as any} />
      </CardContent>
    </Card>
  );
}
