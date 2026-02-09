"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SettingsValues = {
  sniping_window_minutes: number;
  extension_minutes: number;
  default_min_increment: number;
  max_images_per_auction: number;
  bidder_masking_enabled: boolean;
};

export function AdminSettingsForm({ value }: { value: SettingsValues }) {
  const router = useRouter();
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to save settings");
      }

      toast.success("Settings saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auction settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Sniping window (minutes)</Label>
          <Input
            type="number"
            value={form.sniping_window_minutes}
            onChange={(event) => setForm((state) => ({ ...state, sniping_window_minutes: Number(event.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Extension minutes</Label>
          <Input
            type="number"
            value={form.extension_minutes}
            onChange={(event) => setForm((state) => ({ ...state, extension_minutes: Number(event.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Default bid increment</Label>
          <Input
            type="number"
            value={form.default_min_increment}
            onChange={(event) => setForm((state) => ({ ...state, default_min_increment: Number(event.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Max images per auction</Label>
          <Input
            type="number"
            value={form.max_images_per_auction}
            onChange={(event) => setForm((state) => ({ ...state, max_images_per_auction: Number(event.target.value) }))}
          />
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 sm:col-span-2">
          <Switch
            checked={form.bidder_masking_enabled}
            onCheckedChange={(checked) => setForm((state) => ({ ...state, bidder_masking_enabled: checked }))}
          />
          Mask bidder identities in bid history (optional)
        </label>

        <Button onClick={save} disabled={saving} className="sm:col-span-2">
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}
