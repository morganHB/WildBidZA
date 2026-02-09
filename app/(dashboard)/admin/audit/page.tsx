import { AuditLogTable } from "@/components/admin/audit-log-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminAuditPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("audit_log")
    .select("id,action,target_type,target_id,created_at,actor_id")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <AuditLogTable rows={(data ?? []) as any} />
      </CardContent>
    </Card>
  );
}
