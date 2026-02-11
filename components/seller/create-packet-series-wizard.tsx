"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AUCTION_DURATION_PRESETS,
  type AuctionDurationPreset,
  resolveDurationMinutes,
} from "@/lib/constants/auction-duration";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";
import { createPacketSeriesSchema } from "@/lib/validation/auction";
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

type PacketWizardProps = {
  categories: Category[];
  defaultMinIncrement: number;
  maxImagesPerAuction: number;
};

type PacketDraft = {
  id: string;
  packet_label: string;
  animal_count: number;
  avg_weight_kg: string;
  starting_bid: string;
  reserve_price: string;
  min_increment: string;
  duration_preset: AuctionDurationPreset;
  custom_duration_value: string;
  custom_duration_unit: "minutes" | "hours";
  auto_start_next: boolean;
};

const stepTitles = ["Shared Details", "Packet Setup", "Timing & Media"];

function formatJohannesburgDate(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

function makePacket(index: number, defaultMinIncrement: number): PacketDraft {
  return {
    id: `packet-${Date.now()}-${index}`,
    packet_label: `Packet ${index + 1}`,
    animal_count: 1,
    avg_weight_kg: "",
    starting_bid: "",
    reserve_price: "",
    min_increment: String(defaultMinIncrement),
    duration_preset: "1h",
    custom_duration_value: "60",
    custom_duration_unit: "minutes",
    auto_start_next: true,
  };
}

export function CreatePacketSeriesWizard({
  categories,
  defaultMinIncrement,
  maxImagesPerAuction,
}: PacketWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<DraftAuctionImage[]>([]);
  const [videos, setVideos] = useState<DraftAuctionVideo[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    breed_type: "",
    sex: "none",
    age: "",
    province: "",
    city: "",
    farm_name: "",
    health_notes: "",
    permit_reference: "",
    collection_notes: "",
    min_increment: String(defaultMinIncrement),
    start_mode: "immediate" as "immediate" | "scheduled",
    scheduled_start_local: "",
  });
  const [packets, setPackets] = useState<PacketDraft[]>([
    makePacket(0, defaultMinIncrement),
  ]);

  const progress = useMemo(
    () => ((step + 1) / stepTitles.length) * 100,
    [step],
  );

  const firstPacketDuration = resolveDurationMinutes({
    preset: packets[0]?.duration_preset ?? "1h",
    customValue: Number(packets[0]?.custom_duration_value ?? 60),
    customUnit: packets[0]?.custom_duration_unit ?? "minutes",
  });

  const timingPreview = useMemo(() => {
    const start =
      form.start_mode === "scheduled" && form.scheduled_start_local
        ? new Date(form.scheduled_start_local)
        : new Date();

    if (Number.isNaN(start.getTime())) {
      return null;
    }

    const end = new Date(start.getTime() + firstPacketDuration * 60_000);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }, [firstPacketDuration, form.scheduled_start_local, form.start_mode]);

  const uploadImages = async () => {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createSupabaseBrowserClient();
    const paths: { storage_path: string; sort_order: number }[] = [];

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];

      const uploadUrlRes = await fetch("/api/seller/auctions/images/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `packet-series-${index + 1}.jpg`,
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
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
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
          fileName: video.fileName || `packet-series-video-${index + 1}.mp4`,
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

  const submit = async () => {
    setSubmitting(true);

    try {
      const uploadedImages = await uploadImages();
      const uploadedVideos = await uploadVideos();

      const payload = {
        title: form.title,
        description: form.description,
        category_id: form.category_id,
        breed_type: form.breed_type || null,
        sex: form.sex === "none" ? null : form.sex,
        age: form.age || null,
        province: form.province || null,
        city: form.city || null,
        farm_name: form.farm_name || null,
        health_notes: form.health_notes || null,
        permit_reference: form.permit_reference || null,
        collection_notes: form.collection_notes || null,
        min_increment: form.min_increment ? Number(form.min_increment) : null,
        start_mode: form.start_mode,
        scheduled_start:
          form.start_mode === "scheduled" && form.scheduled_start_local
            ? new Date(form.scheduled_start_local).toISOString()
            : null,
        images: uploadedImages,
        videos: uploadedVideos,
        packets: packets.map((packet, index) => ({
          packet_label: packet.packet_label || `Packet ${index + 1}`,
          animal_count: Number(packet.animal_count),
          avg_weight_kg: packet.avg_weight_kg ? Number(packet.avg_weight_kg) : null,
          starting_bid: Number(packet.starting_bid),
          min_increment: packet.min_increment ? Number(packet.min_increment) : null,
          reserve_price: packet.reserve_price ? Number(packet.reserve_price) : null,
          duration_minutes: resolveDurationMinutes({
            preset: packet.duration_preset,
            customValue: Number(packet.custom_duration_value),
            customUnit: packet.custom_duration_unit,
          }),
          auto_start_next: packet.auto_start_next,
        })),
      };

      const parsed = createPacketSeriesSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid packet series");
      }

      const response = await fetch("/api/seller/packet-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to create packet series");
      }

      toast.success("Packet series created");
      router.push("/seller/listings");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create packet series",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Create packet series
        </CardTitle>
        <CardDescription>
          Build multiple packets that can auto-start after each other with per-head bidding.
        </CardDescription>
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
                value={form.sex}
                onValueChange={(value) => setForm((state) => ({ ...state, sex: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Province</Label>
              <Select
                value={form.province}
                onValueChange={(value) =>
                  setForm((state) => ({ ...state, province: value }))
                }
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
              <Input
                value={form.city}
                onChange={(event) =>
                  setForm((state) => ({ ...state, city: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Farm name</Label>
              <Input
                value={form.farm_name}
                onChange={(event) =>
                  setForm((state) => ({ ...state, farm_name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Health notes</Label>
              <Textarea
                rows={3}
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
                  setForm((state) => ({ ...state, permit_reference: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Collection notes</Label>
              <Textarea
                rows={3}
                value={form.collection_notes}
                onChange={(event) =>
                  setForm((state) => ({ ...state, collection_notes: event.target.value }))
                }
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            {packets.map((packet, index) => (
              <div
                key={packet.id}
                className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Packet {index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={packets.length === 1}
                    onClick={() =>
                      setPackets((prev) => prev.filter((item) => item.id !== packet.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Packet label</Label>
                    <Input
                      value={packet.packet_label}
                      onChange={(event) =>
                        setPackets((prev) =>
                          prev.map((item) =>
                            item.id === packet.id
                              ? { ...item, packet_label: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Animals in packet</Label>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      value={packet.animal_count}
                      onChange={(event) =>
                        setPackets((prev) =>
                          prev.map((item) =>
                            item.id === packet.id
                              ? {
                                  ...item,
                                  animal_count: Math.max(1, Number(event.target.value || 1)),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Average weight (kg)</Label>
                    <Input
                      type="number"
                      min={1}
                      step="0.1"
                      value={packet.avg_weight_kg}
                      onChange={(event) =>
                        setPackets((prev) =>
                          prev.map((item) =>
                            item.id === packet.id
                              ? { ...item, avg_weight_kg: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Starting bid per head (ZAR)</Label>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      value={packet.starting_bid}
                      onChange={(event) =>
                        setPackets((prev) =>
                          prev.map((item) =>
                            item.id === packet.id
                              ? { ...item, starting_bid: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min increment per head (ZAR)</Label>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      value={packet.min_increment}
                      onChange={(event) =>
                        setPackets((prev) =>
                          prev.map((item) =>
                            item.id === packet.id
                              ? { ...item, min_increment: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reserve per head (optional)</Label>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      value={packet.reserve_price}
                      onChange={(event) =>
                        setPackets((prev) =>
                          prev.map((item) =>
                            item.id === packet.id
                              ? { ...item, reserve_price: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select
                      value={packet.duration_preset}
                      onValueChange={(value: AuctionDurationPreset) =>
                        setPackets((prev) =>
                          prev.map((item) =>
                            item.id === packet.id
                              ? { ...item, duration_preset: value }
                              : item,
                          ),
                        )
                      }
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
                  {packet.duration_preset === "custom" ? (
                    <div className="space-y-2">
                      <Label>Custom duration</Label>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Input
                          type="number"
                          min={1}
                          step="1"
                          value={packet.custom_duration_value}
                          onChange={(event) =>
                            setPackets((prev) =>
                              prev.map((item) =>
                                item.id === packet.id
                                  ? { ...item, custom_duration_value: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <Select
                          value={packet.custom_duration_unit}
                          onValueChange={(value: "minutes" | "hours") =>
                            setPackets((prev) =>
                              prev.map((item) =>
                                item.id === packet.id
                                  ? { ...item, custom_duration_unit: value }
                                  : item,
                              ),
                            )
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
                  <div className="space-y-2">
                    <Label>After this packet ends</Label>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                      <Switch
                        checked={packet.auto_start_next}
                        onCheckedChange={(checked) =>
                          setPackets((prev) =>
                            prev.map((item) =>
                              item.id === packet.id
                                ? { ...item, auto_start_next: checked }
                                : item,
                            ),
                          )
                        }
                      />
                      Start next packet automatically
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPackets((prev) => [...prev, makePacket(prev.length, defaultMinIncrement)])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add packet
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First packet start</Label>
                <Select
                  value={form.start_mode}
                  onValueChange={(value: "immediate" | "scheduled") =>
                    setForm((state) => ({ ...state, start_mode: value }))
                  }
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
                  disabled={form.start_mode === "immediate"}
                />
              </div>
            </div>

            <div className="space-y-1 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900/40 dark:bg-brand-950/30">
              <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">
                First packet timing preview
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
            </div>

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
            disabled={step === 0 || submitting}
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          >
            Back
          </Button>
          {step < stepTitles.length - 1 ? (
            <Button
              type="button"
              onClick={() =>
                setStep((prev) => Math.min(stepTitles.length - 1, prev + 1))
              }
            >
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Publish packet series
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
