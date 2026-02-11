"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProfileSettingsForm({
  defaultValues,
}: {
  defaultValues: {
    display_name: string | null;
    id_number: string | null;
    phone: string | null;
    province: string | null;
    email: string | null;
  };
}) {
  const [form, setForm] = useState({
    display_name: defaultValues.display_name ?? "",
    id_number: defaultValues.id_number ?? "",
    phone: defaultValues.phone ?? "",
    province: defaultValues.province ?? "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const save = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to save profile");
      }

      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <CardDescription>Keep your account and bidding identity up to date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={defaultValues.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Display name</Label>
          <Input
            value={form.display_name}
            onChange={(event) => setForm((state) => ({ ...state, display_name: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>ID number</Label>
          <Input
            value={form.id_number}
            inputMode="numeric"
            placeholder="13-digit South African ID"
            onChange={(event) => setForm((state) => ({ ...state, id_number: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Cellphone</Label>
          <Input value={form.phone} onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Province</Label>
          <Select
            value={form.province || "none"}
            onValueChange={(value) => setForm((state) => ({ ...state, province: value === "none" ? "" : value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No province selected</SelectItem>
              {SOUTH_AFRICA_PROVINCES.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={loading}>Save profile</Button>
      </CardContent>
    </Card>
  );
}
