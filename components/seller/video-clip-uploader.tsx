"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Trash2, Video } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/index";

export type DraftAuctionVideo = {
  id: string;
  blob: Blob;
  previewUrl: string;
  fileName: string;
  contentType: string;
  trim_start_seconds: number;
  trim_end_seconds: number | null;
  muted: boolean;
  duration_seconds: number;
};

function resolveDuration(video: HTMLVideoElement) {
  const fromMetadata = Number(video.duration);
  if (Number.isFinite(fromMetadata) && fromMetadata > 0) {
    return fromMetadata;
  }

  try {
    if (video.seekable.length > 0) {
      const seekableEnd = Number(video.seekable.end(video.seekable.length - 1));
      if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
        return seekableEnd;
      }
    }
  } catch {
    return 0;
  }

  return 0;
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const whole = Math.floor(value);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function inferFileName(baseName: string, contentType: string) {
  const safeBase = baseName.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
  if (safeBase.includes(".")) {
    return safeBase;
  }

  const ext =
    contentType === "video/webm"
      ? "webm"
      : contentType === "video/quicktime"
        ? "mov"
        : "mp4";
  return `${safeBase}.${ext}`;
}

export function VideoClipUploader({
  value,
  onChange,
  maxVideos = 3,
}: {
  value: DraftAuctionVideo[];
  onChange: (videos: DraftAuctionVideo[]) => void;
  maxVideos?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [workingFile, setWorkingFile] = useState<File | null>(null);
  const [workingFileUrl, setWorkingFileUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [muted, setMuted] = useState(false);
  const [saving, setSaving] = useState(false);

  const minWindow = 1;
  const maxStart = Math.max(0, duration - minWindow);
  const minEnd = Math.min(duration, trimStart + minWindow);
  const effectiveEnd = trimEnd <= 0 ? duration : trimEnd;
  const clipDuration = Math.max(0, effectiveEnd - trimStart);

  const clearEditor = () => {
    if (workingFileUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(workingFileUrl);
    }
    setWorkingFile(null);
    setWorkingFileUrl(null);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setMuted(false);
    setIsEditing(false);
    setSaving(false);
  };

  const handleSelectVideo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setWorkingFile(file);
    setWorkingFileUrl(url);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setMuted(false);
    setIsEditing(true);
    event.target.value = "";
  };

  useEffect(() => {
    const video = previewRef.current;
    if (!video || !isEditing) {
      return;
    }

    const syncStart = () => {
      const nextDuration = resolveDuration(video);
      if (nextDuration <= 0) {
        setDuration(0);
        setTrimStart(0);
        setTrimEnd(0);
        return;
      }
      setDuration(nextDuration);
      setTrimStart(0);
      setTrimEnd(nextDuration);
      video.currentTime = 0;
    };

    if (video.readyState >= 1) {
      syncStart();
      return;
    }

    video.addEventListener("loadedmetadata", syncStart);
    video.addEventListener("durationchange", syncStart);
    return () => {
      video.removeEventListener("loadedmetadata", syncStart);
      video.removeEventListener("durationchange", syncStart);
    };
  }, [isEditing, workingFileUrl]);

  useEffect(() => {
    const video = previewRef.current;
    if (!video || !isEditing || duration <= 0) {
      return;
    }

    if (video.currentTime < trimStart || video.currentTime > effectiveEnd) {
      video.currentTime = trimStart;
    }
  }, [trimStart, effectiveEnd, duration, isEditing]);

  const onPreviewTimeUpdate = () => {
    const video = previewRef.current;
    if (!video || duration <= 0) {
      return;
    }

    if (video.currentTime >= effectiveEnd) {
      video.currentTime = trimStart;
      if (!video.paused) {
        void video.play().catch(() => undefined);
      }
    }
  };

  const saveClip = async () => {
    if (!workingFile || !workingFileUrl) {
      return;
    }

    setSaving(true);
    try {
      const boundedStart = duration > 0 ? Math.min(trimStart, Math.max(0, duration - minWindow)) : 0;
      const normalizedEnd =
        duration > 0 && effectiveEnd < duration - 0.2 ? Number(effectiveEnd.toFixed(2)) : null;

      onChange([
        ...value,
        {
          id: uuidv4(),
          blob: workingFile,
          previewUrl: workingFileUrl,
          fileName: inferFileName(workingFile.name || "auction-video", workingFile.type),
          contentType: workingFile.type || "video/mp4",
          trim_start_seconds: Number(boundedStart.toFixed(2)),
          trim_end_seconds: normalizedEnd,
          muted,
          duration_seconds: Number(Math.max(0, duration).toFixed(2)),
        },
      ]);

      setWorkingFile(null);
      setWorkingFileUrl(null);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const removeVideo = (id: string) => {
    const found = value.find((item) => item.id === id);
    if (found?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(found.previewUrl);
    }
    onChange(value.filter((item) => item.id !== id));
  };

  const moveVideo = (id: string, direction: "up" | "down") => {
    const index = value.findIndex((item) => item.id === id);
    if (index < 0) {
      return;
    }

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) {
      return;
    }

    const next = [...value];
    const [selected] = next.splice(index, 1);
    next.splice(target, 0, selected);
    onChange(next);
  };

  const helperText = useMemo(() => {
    if (!duration) {
      return "Upload MP4, MOV, or WebM. If metadata is still loading, you can still save and continue.";
    }
    return `Clip ${formatSeconds(trimStart)} - ${formatSeconds(effectiveEnd)} (${formatSeconds(
      clipDuration,
    )})`;
  }, [clipDuration, duration, effectiveEnd, trimStart]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Auction videos</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={value.length >= maxVideos}
        >
          <Video className="mr-2 h-4 w-4" />
          Add video
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={handleSelectVideo}
      />

      <p className="text-xs text-slate-500">
        Upload up to {maxVideos} videos. Choose a clip window and default audio for playback.
      </p>

      {value.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {value.map((video, index) => {
            const end = video.trim_end_seconds ?? video.duration_seconds;
            return (
              <div
                key={video.id}
                className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <video
                  src={video.previewUrl}
                  className="aspect-video w-full rounded-lg bg-black object-contain"
                  controls
                  muted={video.muted}
                  playsInline
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Clip: {formatSeconds(video.trim_start_seconds)} - {formatSeconds(end)}
                  </span>
                  <span>{video.muted ? "Muted by default" : "Audio on by default"}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveVideo(video.id, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveVideo(video.id, "down")}
                    disabled={index === value.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeVideo(video.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Dialog open={isEditing} onOpenChange={(open) => (!open ? clearEditor() : setIsEditing(open))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Trim video clip</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-700">
              {workingFileUrl ? (
                <video
                  ref={previewRef}
                  src={workingFileUrl}
                  controls
                  muted={muted}
                  onTimeUpdate={onPreviewTimeUpdate}
                  className="aspect-video w-full object-contain"
                  playsInline
                />
              ) : null}
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="space-y-2">
                <Label>Trim start ({formatSeconds(trimStart)})</Label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, maxStart)}
                  step={0.1}
                  value={trimStart}
                  onChange={(event) => {
                    const nextStart = Number(event.target.value);
                    setTrimStart(nextStart);
                    if (trimEnd < nextStart + minWindow) {
                      setTrimEnd(Math.min(duration, nextStart + minWindow));
                    }
                  }}
                  className={cn(
                    "h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700",
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Trim end ({formatSeconds(effectiveEnd)})</Label>
                <input
                  type="range"
                  min={minEnd}
                  max={Math.max(minEnd, duration)}
                  step={0.1}
                  value={effectiveEnd}
                  onChange={(event) => setTrimEnd(Number(event.target.value))}
                  className={cn(
                    "h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700",
                  )}
                />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span>Mute audio by default</span>
                <Switch checked={muted} onCheckedChange={setMuted} />
              </label>
              <p className="text-xs text-slate-500">{helperText}</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={clearEditor}>
              Cancel
            </Button>
            <Button type="button" onClick={saveClip} disabled={saving}>
              {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save clip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
