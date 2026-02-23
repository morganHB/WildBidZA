"use client";

import { useEffect, useState } from "react";

type IntroRevealProps = {
  onComplete?: () => void;
};

export function IntroReveal({ onComplete }: IntroRevealProps) {
  const [stage, setStage] = useState<"idle" | "splitting" | "finished">("idle");

  useEffect(() => {
    const startSplit = window.setTimeout(() => {
      setStage("splitting");
    }, 3000);

    const cleanup = window.setTimeout(() => {
      setStage("finished");
      onComplete?.();
    }, 5500);

    return () => {
      window.clearTimeout(startSplit);
      window.clearTimeout(cleanup);
    };
  }, [onComplete]);

  if (stage === "finished") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[1000] flex overflow-hidden">
      <div
        className={`h-full w-1/2 border-r border-stone-100 bg-white transition-transform duration-[2200ms] ease-[cubic-bezier(0.85,0,0.15,1)] ${
          stage === "splitting" ? "-translate-x-full" : "translate-x-0"
        } flex items-center justify-end`}
      >
        <div className="pr-4 text-right">
          <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter text-stone-900 md:text-8xl">
            Welcome <br /> To Liba
          </h1>
        </div>
      </div>

      <div
        className={`h-full w-1/2 border-l border-stone-100 bg-white transition-transform duration-[2200ms] ease-[cubic-bezier(0.85,0,0.15,1)] ${
          stage === "splitting" ? "translate-x-full" : "translate-x-0"
        } flex items-center justify-start`}
      >
        <div className="translate-y-12 pl-4 text-left md:translate-y-20">
          <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter text-red-700 md:text-8xl">
            .CO.ZA
          </h1>
          <p className="mt-4 text-[10px] font-black uppercase italic tracking-[0.5em] text-amber-700">
            Experience Heritage
          </p>
        </div>
      </div>
    </div>
  );
}
