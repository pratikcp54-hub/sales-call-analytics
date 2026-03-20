"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Zap } from "lucide-react";
import { toast } from "sonner";
import type { ExtendedCoachInsights } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabId = "tips" | "best" | "missed";

const TAB_LABEL: Record<TabId, string> = {
  tips: "Tips",
  best: "Best moments",
  missed: "Missed opportunities",
};

export function AiCoachingCard({ insights }: { insights: ExtendedCoachInsights | null }) {
  const [reviewed, setReviewed] = useState<Record<number, boolean>>({});
  const [tab, setTab] = useState<TabId>("tips");

  if (!insights) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">AI coaching feedback</CardTitle>
          <CardDescription>Re-run analysis to load coaching data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tips = insights.coaching_tips ?? [];
  const best = insights.best_moments ?? [];
  const missed = insights.missed_opportunities ?? [];
  const severities = ["High", "Medium", "Low"] as const;

  return (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">AI coaching feedback</CardTitle>
        <CardDescription>Tips, highlights, and missed opportunities from the model</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        {/* Segmented control — avoids Base UI Tabs flex/height conflicts that distort layout */}
        <div
          className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-border bg-muted/60 p-1.5 sm:flex-row sm:items-stretch"
          role="tablist"
          aria-label="Coaching sections"
        >
          {(["tips", "best", "missed"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "min-h-[2.75rem] flex-1 rounded-md px-2 py-2 text-center text-xs font-medium leading-snug transition-colors sm:min-h-0 sm:px-3 sm:text-sm",
                tab === id
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              {TAB_LABEL[id]}
            </button>
          ))}
        </div>

        <div className="min-w-0" role="tabpanel">
          {tab === "tips" && (
            <div className="space-y-3">
              {tips.slice(0, 5).map((t, i) => (
                <div key={i} className="flex min-w-0 gap-3 rounded-lg border bg-card p-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          severities[i % 3] === "High"
                            ? "destructive"
                            : severities[i % 3] === "Medium"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {severities[i % 3]}
                      </Badge>
                      {reviewed[i] && <Badge variant="outline">Reviewed</Badge>}
                    </div>
                    <p className="break-words text-sm">{t}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviewed((r) => ({ ...r, [i]: true }));
                        toast.success("Marked as reviewed");
                      }}
                    >
                      Mark as reviewed
                    </Button>
                  </div>
                </div>
              ))}
              {!tips.length && <p className="text-sm text-muted-foreground">No tips yet.</p>}
            </div>
          )}

          {tab === "best" && (
            <div className="space-y-2">
              {best.map((t, i) => (
                <div key={i} className="break-words border-l-4 border-emerald-500 pl-3 text-sm">
                  {t}
                </div>
              ))}
              {!best.length && <p className="text-sm text-muted-foreground">—</p>}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  void navigator.clipboard.writeText(best.join("\n"));
                  toast.success("Copied");
                }}
              >
                Share with agent
              </Button>
            </div>
          )}

          {tab === "missed" && (
            <div className="space-y-3">
              {missed.map((t, i) => {
                const parts = t.split(/\s*[|—]\s*/).map((s) => s.trim());
                const left = parts[0] ?? t;
                const right = parts.slice(1).join(" — ") || null;
                return (
                  <div
                    key={i}
                    className="flex min-w-0 flex-col gap-3 rounded-lg border border-amber-500/35 bg-amber-500/[0.06] p-3 sm:flex-row"
                  >
                    <div className="min-w-0 flex-1 border-l-4 border-amber-500 pl-3">
                      <span className="text-xs font-medium text-muted-foreground">What happened</span>
                      <p className="mt-1 break-words text-sm">{left}</p>
                    </div>
                    <div className="min-w-0 flex-1 border-l-4 border-amber-600/60 pl-3 sm:border-l-4 sm:border-t-0 sm:pt-0">
                      <span className="text-xs font-medium text-muted-foreground">Better approach</span>
                      <p className="mt-1 break-words text-sm">{right ?? "—"}</p>
                    </div>
                  </div>
                );
              })}
              {!missed.length && <p className="text-sm text-muted-foreground">—</p>}
            </div>
          )}
        </div>

        {insights.next_best_action ? (
          <div className="min-w-0 rounded-lg border border-[#3b82f6]/40 bg-[#3b82f6]/5 p-4">
            <p className="mb-1 flex flex-wrap items-center gap-2 text-xs font-medium uppercase text-[#1d4ed8] dark:text-[#60a5fa]">
              <Zap className="size-3.5 shrink-0" /> Next best action
            </p>
            <p className="break-words text-sm text-foreground">{insights.next_best_action}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
