import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuthPage } from "@/lib/auth/guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAuthPage();
  } catch {
    redirect("/sign-in");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
