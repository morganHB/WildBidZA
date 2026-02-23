import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="liba-public min-h-screen bg-white text-stone-900">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
