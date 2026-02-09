import { ProfileSettingsForm } from "@/components/layout/profile-settings-form";
import { requireAuthPage } from "@/lib/auth/guard";

export default async function SettingsPage() {
  const { profile } = await requireAuthPage();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <ProfileSettingsForm
        defaultValues={{
          display_name: profile.display_name,
          phone: profile.phone,
          province: profile.province,
          email: profile.email,
        }}
      />
    </div>
  );
}
