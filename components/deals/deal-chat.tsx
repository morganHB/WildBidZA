"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { relativeFromNow } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/index";
import type { DealMessage } from "@/lib/deals/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type DealChatProps = {
  auctionId: string;
  conversationId: string;
  currentUserId: string;
  counterpartName: string;
  initialMessages: DealMessage[];
};

export function DealChat({
  auctionId,
  conversationId,
  currentUserId,
  counterpartName,
  initialMessages,
}: DealChatProps) {
  const [messages, setMessages] = useState<DealMessage[]>(initialMessages);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/deals/${auctionId}/messages`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to refresh messages");
      }

      setMessages(payload.data.messages ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh messages");
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`deal:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auction_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void refreshMessages();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, refreshMessages]);

  const canSubmit = useMemo(() => message.trim().length > 0 && !submitting, [message, submitting]);

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/deals/${auctionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to send message");
      }

      setMessage("");
      await refreshMessages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-brand-100/70 dark:border-brand-900/40">
      <CardHeader>
        <CardTitle className="text-lg">Deal chat with {counterpartName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[420px] rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">
                No messages yet. Start the conversation to arrange payment, collection, and transfer details.
              </p>
            ) : (
              messages.map((item) => {
                const isOwn = item.sender_id === currentUserId;
                return (
                  <div key={item.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        isOwn
                          ? "bg-brand-600 text-white"
                          : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                      )}
                    >
                      <p className={cn("text-xs", isOwn ? "text-brand-50/90" : "text-slate-500")}>{item.sender_name}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words">{item.message}</p>
                      <p className={cn("mt-2 text-[11px]", isOwn ? "text-brand-100/90" : "text-slate-500")}>
                        {relativeFromNow(item.created_at)} | {new Date(item.created_at).toLocaleString("en-ZA")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Send a message about payment, logistics, or handover."
            maxLength={2000}
            rows={3}
            disabled={submitting}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{loading ? "Syncing messages..." : `${message.length}/2000`}</p>
            <Button onClick={submit} disabled={!canSubmit}>
              {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizontal className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

