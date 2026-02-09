import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { requireAdminPage } from "@/lib/auth/guard";
import { getSiteSettings } from "@/lib/auctions/queries";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const settings = await getSiteSettings();

  return <AdminSettingsForm value={settings as any} />;
}
