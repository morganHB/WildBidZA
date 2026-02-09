import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
