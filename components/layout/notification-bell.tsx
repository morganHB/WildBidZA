"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { subscribeToNotifications } from "@/lib/auctions/realtime";
import { relativeFromNow } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/index";
import type { NotificationListItem } from "@/types/app";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationsResponse = {
  ok: true;
  data: {
    items: NotificationListItem[];
    unread_count: number;
  };
};

export function NotificationBell({
  userId,
  initialUnreadCount = 0,
}: {
  userId: string;
  initialUnreadCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const loadNotifications = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/notifications?limit=30", {
          cache: "no-store",
        });
        const payload = (await response.json()) as NotificationsResponse | { ok: false; error: string };

        if (!response.ok || !payload.ok) {
          throw new Error("Failed to load notifications");
        }

        setItems(payload.data.items);
        setUnreadCount(payload.data.unread_count);
      } catch (error) {
        if (showLoading) {
          toast.error(error instanceof Error ? error.message : "Failed to load notifications");
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadNotifications(true);
  }, [loadNotifications]);

  useEffect(() => {
    const { unsubscribe } = subscribeToNotifications(userId, () => {
      void loadNotifications(false);
    });

    return () => {
      unsubscribe();
    };
  }, [loadNotifications, userId]);

  const openNotification = async (item: NotificationListItem) => {
    if (!item.read_at) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
      } catch {
        // Do not block navigation if marking as read fails.
      }
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, read_at: entry.read_at ?? new Date().toISOString() } : entry,
      ),
    );
    setUnreadCount((count) => (!item.read_at ? Math.max(0, count - 1) : count));
    setOpen(false);
    router.push(item.href);
    router.refresh();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open notifications"
          className="relative rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-base">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
              {unreadCount}
            </span>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />

        {loading ? (
          <div className="flex h-36 items-center justify-center">
            <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="space-y-1 p-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    item.read_at
                      ? "border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                      : "border-brand-100 bg-brand-50/70 hover:bg-brand-100/70 dark:border-brand-900/40 dark:bg-brand-950/30 dark:hover:bg-brand-900/30",
                  )}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{relativeFromNow(item.created_at)}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Button asChild variant="ghost" className="h-9 w-full justify-center rounded-lg">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
