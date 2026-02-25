"use client";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { IntroReveal } from "@/components/layout/intro-reveal";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster />
      <IntroReveal />
    </ThemeProvider>
  );
}
