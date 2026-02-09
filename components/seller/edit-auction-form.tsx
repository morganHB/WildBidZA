"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";
import { updateAuctionSchema } from "@/lib/validation/auction";
import { DraftAuctionImage, ImageCropUploader } from "@/components/seller/image-crop-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Category = {
  id: string;
  name: string;
};

type EditableAuction = {
  id: string;
  title: string;
  description: string;
  category_id: string;
  animal_count: number;
  avg_weight_kg: number | null;
  breed_type: string | null;
  sex: string | null;
  age: string | null;
  weight: string | null;
  province: string | null;
  city: string | null;
  farm_name: string | null;
  health_notes: string | null;
  permit_reference: string | null;
  collection_notes: string | null;
  starting_bid: number;
  min_increment: number;
  reserve_price: number | null;
  start_time: string;
  end_time: string;
};

function toLocalDateTimeInput(iso: string) {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function EditAuctionForm({
  auction,
  categories,
  maxImagesPerAuction,
}: {
  auction: EditableAuction;
  categories: Category[];
  maxImagesPerAuction: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [replaceImages, setReplaceImages] = useState(false);
  const [images, setImages] = useState<DraftAuctionImage[]>([]);
  const [form, setForm] = useState({
    title: auction.title,
    description: auction.description,
    category_id: auction.category_id,
    animal_count: String(auction.animal_count),
    avg_weight_kg: auction.avg_weight_kg ? String(auction.avg_weight_kg) : "",
    breed_type: auction.breed_type ?? "",
    sex: auction.sex === "male" || auction.sex === "female" ? auction.sex : "",
    age: auction.age ?? "",
    weight: auction.weight ?? "",
    province: auction.province ?? "",
    city: auction.city ?? "",
    farm_name: auction.farm_name ?? "",
    health_notes: auction.health_notes ?? "",
    permit_reference: auction.permit_reference ?? "",
    collection_notes: auction.collection_notes ?? "",
    starting_bid: String(auction.starting_bid),
    min_increment: String(auction.min_increment),
    reserve_price: auction.reserve_price ? String(auction.reserve_price) : "",
    start_time_local: toLocalDateTimeInput(auction.start_time),
    end_time_local: toLocalDateTimeInput(auction.end_time),
  });

  const uploadImages = async () => {
    const supabase = createSupabaseBrowserClient();
    const paths: { storage_path: string; sort_order: number }[] = [];

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];

      const uploadUrlRes = await fetch("/api/seller/auctions/images/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `auction-${auction.id}-${index + 1}.jpg`,
          contentType: "image/jpeg",
          size: image.blob.size,
          auctionId: auction.id,
        }),
      });

      const uploadUrlPayload = await uploadUrlRes.json();

      if (!uploadUrlRes.ok || !uploadUrlPayload.ok) {
        throw new Error(uploadUrlPayload.error ?? "Failed to prepare image upload");
      }

      const { path, token } = uploadUrlPayload.data as { path: string; token: string };

      const { error } = await supabase.storage.from("auction-images").uploadToSignedUrl(path, token, image.blob, {
        contentType: "image/jpeg",
        upsert: false,
      });

      if (error) {
        throw new Error(error.message);
      }

      paths.push({ storage_path: path, sort_order: index });
    }

    return paths;
  };

  const save = async () => {
    setSaving(true);

    try {
      if (replaceImages && images.length === 0) {
        throw new Error("Add at least one replacement image before saving");
      }

      const animalCountValue = Number(form.animal_count);
      const avgWeightValue = Number(form.avg_weight_kg);
      const avgWeight =
        Number.isFinite(avgWeightValue) && avgWeightValue > 0 ? avgWeightValue : null;

      if (!Number.isFinite(animalCountValue) || animalCountValue < 1) {
        throw new Error("Number of animals must be at least 1");
      }

      if (animalCountValue > 1 && !avgWeight) {
        throw new Error("Average weight is required for herd listings");
      }

      const payload = {
        title: form.title,
        description: form.description,
        category_id: form.category_id,
        animal_count: animalCountValue,
        avg_weight_kg: avgWeight,
        breed_type: form.breed_type || null,
        sex: form.sex || null,
        age: form.age || null,
        weight: form.weight || null,
        province: form.province || null,
        city: form.city || null,
        farm_name: form.farm_name || null,
        health_notes: form.health_notes || null,
        permit_reference: form.permit_reference || null,
        collection_notes: form.collection_notes || null,
        starting_bid: Number(form.starting_bid),
        min_increment: Number(form.min_increment),
        reserve_price: form.reserve_price ? Number(form.reserve_price) : null,
        start_time: new Date(form.start_time_local).toISOString(),
        end_time: new Date(form.end_time_local).toISOString(),
        ...(replaceImages ? { images: await uploadImages() } : {}),
      };

      const parsed = updateAuctionSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid auction update payload");
      }

      const response = await fetch(`/api/seller/auctions/${auction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to update listing");
      }

      toast.success("Listing updated");
      setReplaceImages(false);
      images.forEach((image) => {
        if (image.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      setImages([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit listing</CardTitle>
        <CardDescription>Update your auction details and save changes any time before closing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={6}
              value={form.description}
              onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(value) => setForm((state) => ({ ...state, category_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Number of animals</Label>
            <Input
              type="number"
              min={1}
              step="1"
              value={form.animal_count}
              onChange={(event) => setForm((state) => ({ ...state, animal_count: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Average weight (kg)</Label>
            <Input
              type="number"
              min={1}
              step="0.1"
              value={form.avg_weight_kg}
              onChange={(event) => setForm((state) => ({ ...state, avg_weight_kg: event.target.value }))}
            />
            <p className="text-xs text-slate-500">Required when number of animals is more than 1.</p>
          </div>
          <div className="space-y-2">
            <Label>Breed / Type</Label>
            <Input value={form.breed_type} onChange={(event) => setForm((state) => ({ ...state, breed_type: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Sex</Label>
            <Select
              value={form.sex || "none"}
              onValueChange={(value) => setForm((state) => ({ ...state, sex: value === "none" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Age</Label>
            <Input value={form.age} onChange={(event) => setForm((state) => ({ ...state, age: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Weight</Label>
            <Input value={form.weight} onChange={(event) => setForm((state) => ({ ...state, weight: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Province</Label>
            <Select value={form.province || "none"} onValueChange={(value) => setForm((state) => ({ ...state, province: value === "none" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {SOUTH_AFRICA_PROVINCES.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(event) => setForm((state) => ({ ...state, city: event.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Farm / Reserve name</Label>
            <Input value={form.farm_name} onChange={(event) => setForm((state) => ({ ...state, farm_name: event.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Health / Vet notes</Label>
            <Textarea
              rows={4}
              value={form.health_notes}
              onChange={(event) => setForm((state) => ({ ...state, health_notes: event.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Permit / reference number</Label>
            <Input
              value={form.permit_reference}
              onChange={(event) => setForm((state) => ({ ...state, permit_reference: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Starting bid (ZAR)</Label>
            <Input
              type="number"
              min={1}
              step="1"
              value={form.starting_bid}
              onChange={(event) => setForm((state) => ({ ...state, starting_bid: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum increment (ZAR)</Label>
            <Input
              type="number"
              min={1}
              step="1"
              value={form.min_increment}
              onChange={(event) => setForm((state) => ({ ...state, min_increment: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Reserve price (optional)</Label>
            <Input
              type="number"
              min={1}
              step="1"
              value={form.reserve_price}
              onChange={(event) => setForm((state) => ({ ...state, reserve_price: event.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Collection notes</Label>
            <Textarea
              rows={4}
              value={form.collection_notes}
              onChange={(event) => setForm((state) => ({ ...state, collection_notes: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Start time (Johannesburg)</Label>
            <Input
              type="datetime-local"
              value={form.start_time_local}
              onChange={(event) => setForm((state) => ({ ...state, start_time_local: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>End time (Johannesburg)</Label>
            <Input
              type="datetime-local"
              value={form.end_time_local}
              onChange={(event) => setForm((state) => ({ ...state, end_time_local: event.target.value }))}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <Switch checked={replaceImages} onCheckedChange={setReplaceImages} />
          Replace listing images (if off, current images stay unchanged)
        </label>

        {replaceImages ? (
          <ImageCropUploader value={images} onChange={setImages} maxImages={maxImagesPerAuction} />
        ) : null}

        <Button onClick={save} disabled={saving}>
          {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
