import { CategoriesManager } from "@/components/admin/categories-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("animal_categories")
    .select("id,name,description,is_active")
    .order("name", { ascending: true });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Animal Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <CategoriesManager categories={(data ?? []) as any} />
      </CardContent>
    </Card>
  );
}
