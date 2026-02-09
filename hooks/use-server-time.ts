"use client";

import { useEffect, useMemo, useState } from "react";
import { MS_IN_SECOND } from "@/lib/constants/time";

function formatCountdown(totalMs: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function useServerCountdown(endTime: string, serverNow: string) {
  const [offset, setOffset] = useState(() => {
    return new Date(serverNow).getTime() - Date.now();
  });

  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    setOffset(new Date(serverNow).getTime() - Date.now());
  }, [serverNow]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now() + offset);
    }, MS_IN_SECOND);

    return () => {
      clearInterval(timer);
    };
  }, [offset]);

  return useMemo(() => {
    const remainingMs = Math.max(0, new Date(endTime).getTime() - now);
    return {
      remainingMs,
      formatted: formatCountdown(remainingMs),
      isEnded: remainingMs <= 0,
    };
  }, [endTime, now]);
}
