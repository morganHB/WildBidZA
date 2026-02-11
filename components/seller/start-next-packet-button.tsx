"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function StartNextPacketButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const startNext = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/seller/auctions/${auctionId}/activate-next`, {
        method: "POST",
      });
      const body = await response.json();

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to activate next packet");
      }

      toast.success("Next packet started");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to activate next packet",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button onClick={startNext} disabled={submitting} className="w-full">
      {submitting ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Play className="mr-2 h-4 w-4" />
      )}
      Start next packet
    </Button>
  );
}
