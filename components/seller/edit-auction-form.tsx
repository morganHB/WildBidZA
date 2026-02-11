"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  AUCTION_DURATION_PRESETS,
  getPresetFromMinutes,
  type AuctionDurationPreset,
  resolveDurationMinutes,
} from "@/lib/constants/auction-duration";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";
import { updateAuctionSchema } from "@/lib/validation/auction";
import {
  DraftAuctionImage,
  ImageCropUploader,
} from "@/components/seller/image-crop-uploader";
import {
  DraftAuctionVideo,
  VideoClipUploader,
} from "@/components/seller/video-clip-uploader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  duration_minutes: number;
  status: "upcoming" | "live" | "ended";
  packet_series_id: string | null;
  auto_start_next: boolean;
  images: {
    id: string;
    storage_path: string;
    sort_order: number;
  }[];
  videos: {
    id: string;
    storage_path: string;
    sort_order: number;
    trim_start_seconds: number;
    trim_end_seconds: number | null;
    muted: boolean;
  }[];
};

function toLocalDateTimeInput(iso: string) {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatJohannesburgDate(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
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
  const [replaceVideos, setReplaceVideos] = useState(false);
  const [existingImages, setExistingImages] = useState(
    [...(auction.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [newImages, setNewImages] = useState<DraftAuctionImage[]>([]);
  const [videos, setVideos] = useState<DraftAuctionVideo[]>([]);
  const canEditTiming = auction.status !== "ended";
  const initialDurationMinutes =
    auction.duration_minutes ??
    Math.max(
      10,
      Math.round(
        (new Date(auction.end_time).getTime() -
          new Date(auction.start_time).getTime()) /
          60_000,
      ),
    );
  const initialPreset = getPresetFromMinutes(initialDurationMinutes);

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
    start_mode: "scheduled" as "immediate" | "scheduled",
    scheduled_start_local: toLocalDateTimeInput(auction.start_time),
    duration_preset: initialPreset,
    custom_duration_value:
      initialPreset === "custom" ? String(initialDurationMinutes) : "60",
    custom_duration_unit: "minutes" as "minutes" | "hours",
    auto_start_next: auction.auto_start_next,
  });

  const durationMinutes = resolveDurationMinutes({
    preset: form.duration_preset as AuctionDurationPreset,
    customValue: Number(form.custom_duration_value),
    customUnit: form.custom_duration_unit,
  });

  const timingPreview = useMemo(() => {
    const start =
      form.start_mode === "scheduled" && form.scheduled_start_local
        ? new Date(form.scheduled_start_local)
        : new Date();

    if (Number.isNaN(start.getTime())) {
      return null;
    }

    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }, [durationMinutes, form.scheduled_start_local, form.start_mode]);

  const uploadImages = async (sortOffset: number) => {
    const supabase = createSupabaseBrowserClient();
    const paths: { storage_path: string; sort_order: number }[] = [];

    for (let index = 0; index < newImages.length; index += 1) {
      const image = newImages[index];

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

      const { path, token } = uploadUrlPayload.data as {
        path: string;
        token: string;
      };

      const { error } = await supabase.storage
        .from("auction-images")
        .uploadToSignedUrl(path, token, image.blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      paths.push({ storage_path: path, sort_order: sortOffset + index });
    }

    return paths;
  };

  const uploadVideos = async () => {
    const supabase = createSupabaseBrowserClient();
    const uploaded: {
      storage_path: string;
      sort_order: number;
      trim_start_seconds: number;
      trim_end_seconds: number | null;
      muted: boolean;
    }[] = [];

    for (let index = 0; index < videos.length; index += 1) {
      const video = videos[index];

      const uploadUrlRes = await fetch("/api/seller/auctions/images/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: video.fileName || `auction-${auction.id}-video-${index + 1}.mp4`,
          contentType: video.contentType || "video/mp4",
          size: video.blob.size,
          auctionId: auction.id,
        }),
      });

      const uploadUrlPayload = await uploadUrlRes.json();

      if (!uploadUrlRes.ok || !uploadUrlPayload.ok) {
        throw new Error(uploadUrlPayload.error ?? "Failed to prepare video upload");
      }

      const { path, token } = uploadUrlPayload.data as {
        path: string;
        token: string;
      };

      const { error } = await supabase.storage
        .from("auction-images")
        .uploadToSignedUrl(path, token, video.blob, {
          contentType: video.contentType || "video/mp4",
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      uploaded.push({
        storage_path: path,
        sort_order: index,
        trim_start_seconds: video.trim_start_seconds,
        trim_end_seconds: video.trim_end_seconds,
        muted: video.muted,
      });
    }

    return uploaded;
  };

  const save = async () => {
    setSaving(true);

    try {
      if (replaceVideos && videos.length === 0) {
        throw new Error("Add at least one replacement video before saving");
      }

      const existingImageIds = new Set(auction.images.map((image) => image.id));
      const hasRemovedImages = existingImages.some((image) => !existingImageIds.has(image.id))
        ? true
        : existingImages.length !== auction.images.length;
      const hasImageChanges = hasRemovedImages || newImages.length > 0;
      const finalImageCount = existingImages.length + newImages.length;
      const finalVideoCount = replaceVideos ? videos.length : auction.videos.length;

      if (finalImageCount + finalVideoCount <= 0) {
        throw new Error("Add at least one image or video before saving");
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

      const startTime =
        form.start_mode === "scheduled"
          ? new Date(form.scheduled_start_local)
          : new Date();

      if (canEditTiming && Number.isNaN(startTime.getTime())) {
        throw new Error("Provide a valid start time");
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
        ...(canEditTiming
          ? {
              start_time: startTime.toISOString(),
              duration_minutes: durationMinutes,
            }
          : {}),
        ...(auction.packet_series_id ? { auto_start_next: form.auto_start_next } : {}),
        ...(hasImageChanges
          ? {
              images: [
                ...existingImages.map((image, index) => ({
                  storage_path: image.storage_path,
                  sort_order: index,
                })),
                ...(await uploadImages(existingImages.length)),
              ],
            }
          : {}),
        ...(replaceVideos ? { videos: await uploadVideos() } : {}),
      };

      const parsed = updateAuctionSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues[0]?.message ?? "Invalid auction update payload",
        );
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
      newImages.forEach((image) => {
        if (image.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      videos.forEach((video) => {
        if (video.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(video.previewUrl);
        }
      });
      setNewImages([]);
      setVideos([]);
      setReplaceVideos(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update listing",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit listing</CardTitle>
        <CardDescription>
          Update your auction details and save changes any time before closing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((state) => ({ ...state, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={6}
              value={form.description}
              onChange={(event) =>
                setForm((state) => ({ ...state, description: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category_id}
              onValueChange={(value) =>
                setForm((state) => ({ ...state, category_id: value }))
              }
            >
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
              onChange={(event) =>
                setForm((state) => ({ ...state, animal_count: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Average weight (kg)</Label>
            <Input
              type="number"
              min={1}
              step="0.1"
              value={form.avg_weight_kg}
              onChange={(event) =>
                setForm((state) => ({ ...state, avg_weight_kg: event.target.value }))
              }
            />
            <p className="text-xs text-slate-500">
              Required when number of animals is more than 1.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Breed / Type</Label>
            <Input
              value={form.breed_type}
              onChange={(event) =>
                setForm((state) => ({ ...state, breed_type: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Sex</Label>
            <Select
              value={form.sex || "none"}
              onValueChange={(value) =>
                setForm((state) => ({
                  ...state,
                  sex: value === "none" ? "" : value,
                }))
              }
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
            <Input
              value={form.age}
              onChange={(event) =>
                setForm((state) => ({ ...state, age: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Weight</Label>
            <Input
              value={form.weight}
              onChange={(event) =>
                setForm((state) => ({ ...state, weight: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Province</Label>
            <Select
              value={form.province || "none"}
              onValueChange={(value) =>
                setForm((state) => ({
                  ...state,
                  province: value === "none" ? "" : value,
                }))
              }
            >
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
            <Input
              value={form.city}
              onChange={(event) =>
                setForm((state) => ({ ...state, city: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Farm / Reserve name</Label>
            <Input
              value={form.farm_name}
              onChange={(event) =>
                setForm((state) => ({ ...state, farm_name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Health / Vet notes</Label>
            <Textarea
              rows={4}
              value={form.health_notes}
              onChange={(event) =>
                setForm((state) => ({ ...state, health_notes: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Permit / reference number</Label>
            <Input
              value={form.permit_reference}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  permit_reference: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Starting bid (ZAR)</Label>
            <Input
              type="number"
              min={1}
              step="1"
              value={form.starting_bid}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  starting_bid: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum increment (ZAR)</Label>
            <Input
              type="number"
              min={1}
              step="1"
              value={form.min_increment}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  min_increment: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Reserve price (optional)</Label>
            <Input
              type="number"
              min={1}
              step="1"
              value={form.reserve_price}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  reserve_price: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Collection notes</Label>
            <Textarea
              rows={4}
              value={form.collection_notes}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  collection_notes: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Auction start</Label>
            <Select
              value={form.start_mode}
              onValueChange={(value: "immediate" | "scheduled") =>
                setForm((state) => ({ ...state, start_mode: value }))
              }
              disabled={!canEditTiming}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Start now</SelectItem>
                <SelectItem value="scheduled">Schedule start</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scheduled start (Johannesburg)</Label>
            <Input
              type="datetime-local"
              value={form.scheduled_start_local}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  scheduled_start_local: event.target.value,
                }))
              }
              disabled={!canEditTiming || form.start_mode === "immediate"}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={form.duration_preset}
              onValueChange={(value: AuctionDurationPreset) =>
                setForm((state) => ({ ...state, duration_preset: value }))
              }
              disabled={!canEditTiming}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUCTION_DURATION_PRESETS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.duration_preset === "custom" ? (
            <div className="space-y-2">
              <Label>Custom duration</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={form.custom_duration_value}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      custom_duration_value: event.target.value,
                    }))
                  }
                  disabled={!canEditTiming}
                />
                <Select
                  value={form.custom_duration_unit}
                  onValueChange={(value: "minutes" | "hours") =>
                    setForm((state) => ({
                      ...state,
                      custom_duration_unit: value,
                    }))
                  }
                  disabled={!canEditTiming}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <div className="space-y-1 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:col-span-2 dark:border-brand-900/40 dark:bg-brand-950/30">
            <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Timing preview
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Duration: <span className="font-semibold">{durationMinutes} minutes</span>
            </p>
            {timingPreview ? (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  Estimated start:{" "}
                  <span className="font-semibold">
                    {formatJohannesburgDate(timingPreview.startIso)}
                  </span>
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  Estimated end:{" "}
                  <span className="font-semibold">
                    {formatJohannesburgDate(timingPreview.endIso)}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-red-600">
                Enter a valid schedule to preview timings.
              </p>
            )}
            {!canEditTiming ? (
              <p className="text-xs text-slate-500">
                Timing cannot be changed after auction end.
              </p>
            ) : null}
          </div>
        </div>

        {auction.packet_series_id ? (
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
            <Switch
              checked={form.auto_start_next}
              onCheckedChange={(checked) =>
                setForm((state) => ({ ...state, auto_start_next: checked }))
              }
            />
            Auto-start next packet when this packet ends
          </label>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Listing images</Label>
            <p className="text-xs text-slate-500">
              {existingImages.length + newImages.length} / {maxImagesPerAuction}
            </p>
          </div>

          {existingImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {existingImages.map((image) => {
                const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-images/${image.storage_path}`;

                return (
                  <div
                    key={image.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <img
                      src={imageUrl}
                      alt="Listing image"
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExistingImages((state) =>
                          state.filter((item) => item.id !== image.id),
                        )
                      }
                      className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-white opacity-90 transition hover:bg-black/80"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No existing images kept. Add at least one image or a video before saving.
            </p>
          )}

          <ImageCropUploader
            value={newImages}
            onChange={setNewImages}
            maxImages={Math.max(0, maxImagesPerAuction - existingImages.length)}
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <Switch checked={replaceVideos} onCheckedChange={setReplaceVideos} />
          Replace listing videos (if off, current videos stay unchanged)
        </label>

        {replaceVideos ? (
          <VideoClipUploader value={videos} onChange={setVideos} maxVideos={3} />
        ) : null}

        <Button onClick={save} disabled={saving}>
          {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
