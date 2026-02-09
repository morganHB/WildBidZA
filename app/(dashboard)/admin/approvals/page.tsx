import { ApprovalsTable } from "@/components/admin/approvals-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminApprovalsPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,email,approval_status,created_at")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvals Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <ApprovalsTable rows={(data ?? []) as any} />
      </CardContent>
    </Card>
  );
}
