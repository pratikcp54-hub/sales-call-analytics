"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  audioUrl: string;
  segments: TranscriptSegment[] | null;
};

export function CallAudioPlayer({ audioUrl, segments }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "oklch(0.708 0 0)",
      progressColor: "oklch(0.205 0 0)",
      cursorColor: "oklch(0.205 0 0)",
      barWidth: 2,
      barGap: 1,
      height: 72,
    });

    wsRef.current = ws;
    ws.on("ready", (d) => {
      setDurationMs(d * 1000);
      setReady(true);
    });
    ws.on("timeupdate", (t) => setCurrentMs(t * 1000));
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("finish", () => setPlaying(false));

    ws.load(audioUrl).catch(() => setReady(false));

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [audioUrl]);

  const toggle = useCallback(() => {
    wsRef.current?.playPause();
  }, []);

  const seekToUtterance = (startMs: number) => {
    if (!durationMs) return;
    wsRef.current?.seekTo(startMs / durationMs);
    wsRef.current?.play();
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const activeIdx =
    segments?.findIndex((u) => currentMs >= u.start && currentMs <= u.end) ?? -1;

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full overflow-hidden rounded-lg border bg-muted/30" />
      <div className="flex items-center gap-3">
        <Button type="button" size="icon" variant="secondary" onClick={toggle} disabled={!ready}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <span className="font-mono text-sm text-muted-foreground">
          {fmt(currentMs)} / {fmt(durationMs)}
        </span>
      </div>
      {segments && segments.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Transcript (synced)</p>
          <ScrollArea className="h-[220px] rounded-md border bg-card p-3">
            <ul className="space-y-2 text-sm">
              {segments.map((u, i) => (
                <li key={`${u.start}-${i}`}>
                  <button
                    type="button"
                    onClick={() => seekToUtterance(u.start)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                      i === activeIdx ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted"
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      Speaker {u.speaker} · {fmt(u.start)}
                    </span>
                    <p className="mt-0.5 text-foreground">{u.text}</p>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
