"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import type { CallRow } from "@/lib/types";
import { improvementInsightsSections } from "@/lib/improvement-insights";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function ImprovementInsightsCell({ call }: { call: CallRow }) {
  const [open, setOpen] = useState(false);
  const { negatives, missed } = improvementInsightsSections(call);
  const hasContent = negatives.length > 0 || missed.length > 0;

  if (call.status !== "completed") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (!hasContent) {
    return <span className="text-sm text-muted-foreground/80">No issues flagged</span>;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto max-w-full justify-start gap-2 whitespace-normal py-2 text-left"
        onClick={() => setOpen(true)}
      >
        <Lightbulb className="size-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
        <span className="min-w-0">
          <span className="block font-medium text-foreground">View improvement insights</span>
          <span className="text-xs font-normal text-muted-foreground">
            {negatives.length + missed.length} item{negatives.length + missed.length === 1 ? "" : "s"}
          </span>
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            "flex max-h-[min(90vh,640px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 py-4 pr-12 text-left">
            <DialogTitle>Improvement insights</DialogTitle>
            <DialogDescription className="line-clamp-2 text-xs sm:text-sm">{call.file_name}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-6">
              {negatives.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Areas to improve
                  </h3>
                  <ul className="space-y-3 text-sm leading-relaxed text-foreground">
                    {negatives.map((item, i) => (
                      <li key={`n-${i}`} className="flex gap-3">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {missed.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Missed opportunities
                  </h3>
                  <ul className="space-y-3 text-sm leading-relaxed text-foreground">
                    {missed.map((item, i) => (
                      <li key={`m-${i}`} className="flex gap-3">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-muted/40 px-4 py-3">
            <Link
              href={`/calls/${call.id}`}
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full sm:w-auto")}
              onClick={() => setOpen(false)}
            >
              Open full call analysis
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
