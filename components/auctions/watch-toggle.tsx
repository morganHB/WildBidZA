"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function WatchToggle({ auctionId, isFavorited }: { auctionId: string; isFavorited: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/favorite`, {
        method: isFavorited ? "DELETE" : "POST",
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to update watchlist");
      }

      toast.success(isFavorited ? "Removed from watchlist" : "Added to watchlist");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={isFavorited ? "default" : "outline"} onClick={toggle} disabled={loading}>
      <Heart className="mr-2 h-4 w-4" />
      {isFavorited ? "Watching" : "Watch"}
    </Button>
  );
}
