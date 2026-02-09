import { RoleGroupsTable } from "@/components/admin/role-groups-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminRolesPage() {
  const { user } = await requireAdminPage();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,email,approval_status,seller_status,is_admin,created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <RoleGroupsTable rows={(data ?? []) as any} currentUserId={user.id} />
      </CardContent>
    </Card>
  );
}
