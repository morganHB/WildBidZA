"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ZodError } from "zod";
import {
  AUCTION_DURATION_PRESETS,
  type AuctionDurationPreset,
  resolveDurationMinutes,
} from "@/lib/constants/auction-duration";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";
import { createAuctionSchema } from "@/lib/validation/auction";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DraftAuctionImage,
  ImageCropUploader,
} from "@/components/seller/image-crop-uploader";
import {
  DraftAuctionVideo,
  VideoClipUploader,
} from "@/components/seller/video-clip-uploader";

type Category = {
  id: string;
  name: string;
};

type AuctionWizardProps = {
  categories: Category[];
  defaultMinIncrement: number;
  maxImagesPerAuction: number;
};

type FormValues = {
  title: string;
  description: string;
  category_id: string;
  animal_count: number;
  avg_weight_kg?: number;
  breed_type: string;
  sex: string;
  age: string;
  province: string;
  city: string;
  farm_name: string;
  health_notes: string;
  permit_reference: string;
  collection_notes: string;
  starting_bid: number;
  min_increment: number;
  reserve_price?: number;
  start_mode: "immediate" | "scheduled";
  scheduled_start_local: string;
  duration_preset: AuctionDurationPreset;
  custom_duration_value: number;
  custom_duration_unit: "minutes" | "hours";
};

const stepTitles = ["Basics", "Animal Details", "Pricing", "Timing", "Media"];

function toReadableErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Invalid auction details";
  }

  if (error instanceof Error) {
    const raw = error.message?.trim();

    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const parsed = JSON.parse(raw) as Array<{ message?: string }>;
        if (Array.isArray(parsed) && parsed[0]?.message) {
          return parsed[0].message;
        }
      } catch {
        return raw;
      }
    }

    return raw || "Failed to publish auction";
  }

  return "Failed to publish auction";
}

function formatJohannesburgDate(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

export function CreateAuctionWizard({
  categories,
  defaultMinIncrement,
  maxImagesPerAuction,
}: AuctionWizardProps) {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<DraftAuctionImage[]>([]);
  const [videos, setVideos] = useState<DraftAuctionVideo[]>([]);
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      animal_count: 1,
      avg_weight_kg: undefined,
      breed_type: "",
      sex: "",
      age: "",
      province: "",
      city: "",
      farm_name: "",
      health_notes: "",
      permit_reference: "",
      collection_notes: "",
      starting_bid: 0,
      min_increment: defaultMinIncrement,
      reserve_price: undefined,
      start_mode: "immediate",
      scheduled_start_local: "",
      duration_preset: "1h",
      custom_duration_value: 60,
      custom_duration_unit: "minutes",
    },
    mode: "onBlur",
  });

  const progress = useMemo(
    () => ((step + 1) / stepTitles.length) * 100,
    [step],
  );

  const watchedStartMode = form.watch("start_mode");
  const watchedScheduledStart = form.watch("scheduled_start_local");
  const watchedDurationPreset = form.watch("duration_preset");
  const watchedCustomDurationValue = form.watch("custom_duration_value");
  const watchedCustomDurationUnit = form.watch("custom_duration_unit");

  const durationMinutes = resolveDurationMinutes({
    preset: watchedDurationPreset,
    customValue: watchedCustomDurationValue,
    customUnit: watchedCustomDurationUnit,
  });

  const timingPreview = useMemo(() => {
    const start =
      watchedStartMode === "scheduled" && watchedScheduledStart
        ? new Date(watchedScheduledStart)
        : new Date();

    if (Number.isNaN(start.getTime())) {
      return null;
    }

    const end = new Date(start.getTime() + durationMinutes * 60_000);

    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      durationMinutes,
    };
  }, [watchedStartMode, watchedScheduledStart, durationMinutes]);

  const uploadImages = async () => {
    const supabase = createSupabaseBrowserClient();
    const paths: { storage_path: string; sort_order: number }[] = [];

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];

      const uploadUrlRes = await fetch("/api/seller/auctions/images/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `auction-${index + 1}.jpg`,
          contentType: "image/jpeg",
          size: image.blob.size,
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

      paths.push({
        storage_path: path,
        sort_order: index,
      });
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
          fileName: video.fileName || `auction-video-${index + 1}.mp4`,
          contentType: video.contentType || "video/mp4",
          size: video.blob.size,
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

  const publish = form.handleSubmit(async (values) => {
    setPublishing(true);

    try {
      const uploadedImages = await uploadImages();
      const uploadedVideos = await uploadVideos();

      const resolvedDurationMinutes = resolveDurationMinutes({
        preset: values.duration_preset,
        customValue: values.custom_duration_value,
        customUnit: values.custom_duration_unit,
      });

      const startTime =
        values.start_mode === "scheduled"
          ? values.scheduled_start_local
            ? new Date(values.scheduled_start_local)
            : null
          : new Date();

      if (!startTime || Number.isNaN(startTime.getTime())) {
        throw new Error("Please provide a valid start time");
      }

      if (values.start_mode === "scheduled" && startTime.getTime() <= Date.now()) {
        throw new Error("Scheduled start must be in the future");
      }

      const payloadResult = createAuctionSchema.safeParse({
        title: values.title,
        description: values.description,
        category_id: values.category_id,
        animal_count: Number(values.animal_count),
        avg_weight_kg:
          Number.isFinite(values.avg_weight_kg) &&
          Number(values.avg_weight_kg) > 0
            ? Number(values.avg_weight_kg)
            : null,
        breed_type: values.breed_type || null,
        sex: values.sex || null,
        age: values.age || null,
        province: values.province || null,
        city: values.city || null,
        farm_name: values.farm_name || null,
        health_notes: values.health_notes || null,
        permit_reference: values.permit_reference || null,
        collection_notes: values.collection_notes || null,
        starting_bid: Number(values.starting_bid),
        min_increment: Number(values.min_increment),
        reserve_price: values.reserve_price ? Number(values.reserve_price) : null,
        bid_pricing_mode: "lot_total",
        duration_minutes: resolvedDurationMinutes,
        start_time: startTime.toISOString(),
        auto_start_next: true,
        images: uploadedImages,
        videos: uploadedVideos,
      });

      if (!payloadResult.success) {
        throw new Error(
          payloadResult.error.issues[0]?.message ?? "Invalid auction details",
        );
      }

      const payload = payloadResult.data;

      const response = await fetch("/api/seller/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to create auction");
      }

      toast.success("Auction published");
      router.push("/seller/listings");
      router.refresh();
    } catch (error) {
      toast.error(toReadableErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Auction</CardTitle>
        <CardDescription>
          Publish premium listings with compliant animal and permit metadata.
        </CardDescription>
        <p className="text-xs text-slate-500">
          Need chained packets?{" "}
          <Link href="/seller/create/packets" className="text-brand-700 hover:underline">
            Create packet series
          </Link>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          Step {step + 1} of {stepTitles.length}: {stepTitles[step]}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 ? (
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Prime Kalahari Bull"
                {...form.register("title")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={8} {...form.register("description")} />
              <p className="text-xs text-slate-500">Minimum 10 characters.</p>
            </div>
            <div className="space-y-2">
              <Label>Animal category</Label>
              <Select
                value={form.watch("category_id")}
                onValueChange={(value) =>
                  form.setValue("category_id", value, { shouldValidate: true })
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
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Number of animals</Label>
              <Input
                type="number"
                min={1}
                step="1"
                {...form.register("animal_count", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Average weight (kg)</Label>
              <Input
                type="number"
                min={1}
                step="0.1"
                {...form.register("avg_weight_kg", { valueAsNumber: true })}
              />
              <p className="text-xs text-slate-500">
                Required for herd listings (when number of animals is more than 1).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Breed / Type</Label>
              <Input {...form.register("breed_type")} />
            </div>
            <div className="space-y-2">
              <Label>Sex</Label>
              <Select
                value={form.watch("sex") || "none"}
                onValueChange={(value) =>
                  form.setValue("sex", value === "none" ? "" : value, {
                    shouldValidate: true,
                  })
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
              <Input {...form.register("age")} />
            </div>
            <div className="space-y-2">
              <Label>Province</Label>
              <Select
                value={form.watch("province")}
                onValueChange={(value) => form.setValue("province", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
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
              <Input {...form.register("city")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Farm / Reserve Name</Label>
              <Input {...form.register("farm_name")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Health / Vet notes</Label>
              <Textarea rows={4} {...form.register("health_notes")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Permit / reference number</Label>
              <Input {...form.register("permit_reference")} />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Starting bid (ZAR)</Label>
              <Input
                type="number"
                step="1"
                min={1}
                {...form.register("starting_bid", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum increment (ZAR)</Label>
              <Input
                type="number"
                step="1"
                min={1}
                {...form.register("min_increment", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Reserve price (optional)</Label>
              <Input
                type="number"
                step="1"
                min={1}
                {...form.register("reserve_price", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Collection notes</Label>
              <Textarea rows={4} {...form.register("collection_notes")} />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Auction start</Label>
              <Select
                value={form.watch("start_mode")}
                onValueChange={(value: "immediate" | "scheduled") =>
                  form.setValue("start_mode", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose start mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Start now</SelectItem>
                  <SelectItem value="scheduled">Schedule start</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchedStartMode === "scheduled" ? (
              <div className="space-y-2">
                <Label>Scheduled start (Johannesburg)</Label>
                <Input
                  type="datetime-local"
                  {...form.register("scheduled_start_local")}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Starts</Label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Immediately after publish
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={form.watch("duration_preset")}
                onValueChange={(value: AuctionDurationPreset) =>
                  form.setValue("duration_preset", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose duration" />
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

            {watchedDurationPreset === "custom" ? (
              <div className="space-y-2">
                <Label>Custom duration</Label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    {...form.register("custom_duration_value", {
                      valueAsNumber: true,
                    })}
                  />
                  <Select
                    value={form.watch("custom_duration_unit")}
                    onValueChange={(value: "minutes" | "hours") =>
                      form.setValue("custom_duration_unit", value)
                    }
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
                <p className="text-sm text-red-600">Enter a valid schedule to preview timings.</p>
              )}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <ImageCropUploader
              value={images}
              onChange={setImages}
              maxImages={maxImagesPerAuction}
            />
            <VideoClipUploader value={videos} onChange={setVideos} maxVideos={3} />
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0 || publishing}
          >
            Back
          </Button>
          {step < stepTitles.length - 1 ? (
            <Button
              type="button"
              onClick={() =>
                setStep((prev) =>
                  Math.min(stepTitles.length - 1, prev + 1),
                )
              }
            >
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={publish} disabled={publishing}>
              {publishing ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Publish auction
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
