"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ManagerRow = {
  auction_id: string;
  manager_user_id: string;
  invited_by_user_id: string;
  can_edit: boolean;
  can_stream: boolean;
  created_at: string;
  profile:
    | {
        id: string;
        display_name: string | null;
        email: string | null;
        role_group: "user" | "marketer";
        is_admin: boolean;
        approval_status: "pending" | "approved" | "rejected";
      }
    | null
    | {
        id: string;
        display_name: string | null;
        email: string | null;
        role_group: "user" | "marketer";
        is_admin: boolean;
        approval_status: "pending" | "approved" | "rejected";
      }[];
};

export function ManageAuctionManagersCard({
  auctionId,
  currentUserId,
  auctionOwnerId,
  isAdmin,
  canManage,
}: {
  auctionId: string;
  currentUserId: string;
  auctionOwnerId: string;
  isAdmin: boolean;
  canManage: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [managerUserId, setManagerUserId] = useState("");
  const [managers, setManagers] = useState<ManagerRow[]>([]);

  const canInvite = isAdmin || currentUserId === auctionOwnerId;

  const isCurrentUserCoManager = useMemo(
    () => managers.some((manager) => manager.manager_user_id === currentUserId),
    [currentUserId, managers],
  );

  const loadManagers = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/seller/auctions/${auctionId}/managers`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { ok: boolean; data?: ManagerRow[]; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to load managers");
      }

      setManagers(payload.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load managers");
    } finally {
      setLoading(false);
    }
  }, [auctionId, canManage]);

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

  const inviteManager = async () => {
    if (!managerUserId.trim()) {
      toast.error("Enter the user ID to invite");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/seller/auctions/${auctionId}/managers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manager_user_id: managerUserId.trim(),
          can_edit: true,
          can_stream: true,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to invite manager");
      }

      toast.success("Manager invited");
      setManagerUserId("");
      await loadManagers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite manager");
    } finally {
      setSubmitting(false);
    }
  };

  const revokeManager = async (managerId: string) => {
    setRevokeId(managerId);

    try {
      const response = await fetch(`/api/seller/auctions/${auctionId}/managers/${managerId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to revoke manager");
      }

      toast.success("Manager access revoked");
      await loadManagers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke manager");
    } finally {
      setRevokeId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite to manage</CardTitle>
        <CardDescription>
          Invite approved marketer/admin users by user ID to co-manage this auction and control livestream.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canInvite ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={managerUserId}
              onChange={(event) => setManagerUserId(event.target.value)}
              placeholder="Manager user UUID"
            />
            <Button type="button" onClick={inviteManager} disabled={submitting}>
              {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Invite
            </Button>
          </div>
        ) : isCurrentUserCoManager ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-100">
            You are an invited co-manager for this auction.
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading managers...
          </div>
        ) : managers.length === 0 ? (
          <p className="text-sm text-slate-500">No co-managers invited yet.</p>
        ) : (
          <div className="space-y-2">
            {managers.map((manager) => {
              const profile = Array.isArray(manager.profile) ? manager.profile[0] : manager.profile;

              return (
                <div
                  key={`${manager.auction_id}:${manager.manager_user_id}`}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {profile?.display_name || profile?.email || manager.manager_user_id}
                    </p>
                    <p className="text-xs text-slate-500">{manager.manager_user_id}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={manager.can_edit ? "outline" : "secondary"}>
                        {manager.can_edit ? "Can edit" : "Read only"}
                      </Badge>
                      <Badge variant={manager.can_stream ? "outline" : "secondary"}>
                        {manager.can_stream ? "Can stream" : "No stream"}
                      </Badge>
                    </div>
                  </div>

                  {canInvite ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void revokeManager(manager.manager_user_id)}
                      disabled={revokeId === manager.manager_user_id}
                    >
                      {revokeId === manager.manager_user_id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
