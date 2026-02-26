"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildBrowserRedirectUrl } from "@/lib/auth/redirect";
import { Button } from "@/components/ui/button";

function sanitizeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/dashboard";
  }

  return nextPath;
}

export function GoogleAuthButton({
  mode,
  nextPath,
}: {
  mode: "signin" | "signup";
  nextPath?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const safeNextPath = sanitizeNextPath(nextPath);
      const callbackParams = new URLSearchParams({ next: safeNextPath });
      const redirectTo = buildBrowserRedirectUrl(`/auth/callback?${callbackParams.toString()}`);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} with Google`);
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" type="button" className="w-full" onClick={handleGoogleAuth} disabled={loading}>
      {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
      Continue with Google
    </Button>
  );
}
