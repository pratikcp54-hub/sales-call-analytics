"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CallRow } from "@/lib/types";
import { formatCallDateTime } from "@/lib/format-datetime";
import type { ConversionTag } from "@/lib/types";

const TAGS: { value: ConversionTag | ""; label: string }[] = [
  { value: "", label: "— Not set —" },
  { value: "converted", label: "Converted" },
  { value: "not_converted", label: "Not converted" },
  { value: "follow_up_pending", label: "Follow-up pending" },
];

export function ManagerReviewPanel({
  callId,
  initial,
  onSaved,
}: {
  callId: string;
  initial: CallRow;
  onSaved?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initial.manager_notes ?? "");
  const [rating, setRating] = useState(initial.manager_rating ?? 0);
  const [tag, setTag] = useState<ConversionTag | "">(initial.conversion_tag ?? "");
  const [flagged, setFlagged] = useState(initial.flagged_for_review);
  const [reviewer, setReviewer] = useState("Manager");

  const save = async () => {
    const res = await fetch(`/api/calls/${callId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manager_notes: notes,
        manager_rating: rating || null,
        conversion_tag: tag || null,
        flagged_for_review: flagged,
        reviewed_by: reviewer,
        stamp_review: true,
      }),
    });
    if (!res.ok) {
      toast.error("Could not save");
      return;
    }
    toast.success("Saved");
    await onSaved?.();
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="cursor-pointer" onClick={() => setOpen(!open)}>
        <CardTitle className="text-base">Manager review</CardTitle>
        <CardDescription>Private notes & conversion tagging (stored locally in SQLite)</CardDescription>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          {initial.reviewed_at && (
            <p className="text-xs text-muted-foreground">
              Last saved: {formatCallDateTime(initial.reviewed_at)}
              {initial.reviewed_by ? ` · ${initial.reviewed_by}` : ""}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Manager notes</Label>
            <textarea
              id="notes"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Private coaching notes…"
            />
          </div>
          <div className="space-y-2">
            <Label>Manager rating (1–5)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={rating === n ? "default" : "outline"}
                  onClick={() => setRating(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">Conversion tag</Label>
            <select
              id="tag"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={tag}
              onChange={(e) => setTag(e.target.value as ConversionTag | "")}
            >
              {TAGS.map((t) => (
                <option key={t.value || "empty"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="flag"
              type="checkbox"
              className="size-4 rounded border"
              checked={flagged}
              onChange={(e) => setFlagged(e.target.checked)}
            />
            <Label htmlFor="flag">Flag for team review</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev">Reviewer name</Label>
            <input
              id="rev"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
            />
          </div>
          <Button type="button" onClick={() => void save()}>
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
