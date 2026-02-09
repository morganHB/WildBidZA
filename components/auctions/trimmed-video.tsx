"use client";

import { useEffect, useMemo, useRef } from "react";

type TrimmedVideoProps = {
  src: string;
  className?: string;
  controls?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  startSeconds?: number;
  endSeconds?: number | null;
  poster?: string;
};

export function TrimmedVideo({
  src,
  className,
  controls = true,
  muted = false,
  autoPlay = false,
  loop = false,
  playsInline = true,
  startSeconds = 0,
  endSeconds = null,
  poster,
}: TrimmedVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  const normalizedStart = useMemo(() => Math.max(0, startSeconds), [startSeconds]);
  const normalizedEnd = useMemo(
    () => (typeof endSeconds === "number" && Number.isFinite(endSeconds) ? endSeconds : null),
    [endSeconds],
  );

  useEffect(() => {
    const video = ref.current;
    if (!video) {
      return;
    }

    const seekToStart = () => {
      if (video.currentTime < normalizedStart || video.currentTime === 0) {
        video.currentTime = normalizedStart;
      }
    };

    if (video.readyState >= 1) {
      seekToStart();
      return;
    }

    video.addEventListener("loadedmetadata", seekToStart);
    return () => {
      video.removeEventListener("loadedmetadata", seekToStart);
    };
  }, [normalizedStart, src]);

  const onTimeUpdate = () => {
    const video = ref.current;
    if (!video || normalizedEnd == null) {
      return;
    }

    if (video.currentTime >= normalizedEnd) {
      video.currentTime = normalizedStart;
      if (loop || autoPlay) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }
  };

  return (
    <video
      ref={ref}
      src={src}
      className={className}
      controls={controls}
      muted={muted}
      autoPlay={autoPlay}
      playsInline={playsInline}
      loop={false}
      poster={poster}
      onTimeUpdate={onTimeUpdate}
    />
  );
}
