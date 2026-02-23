import { SiteHeader } from "@/components/layout/site-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="liba-auth min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
