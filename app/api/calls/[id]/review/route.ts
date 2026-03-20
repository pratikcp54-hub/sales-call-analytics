import { NextRequest, NextResponse } from "next/server";
import { getCallById, updateCallManagerReview } from "@/lib/db";
import type { CallRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseTag(raw: unknown): CallRow["conversion_tag"] {
  if (raw == null || raw === "") return null;
  const s = String(raw);
  if (s === "converted" || s === "not_converted" || s === "follow_up_pending") return s;
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = getCallById(id);
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const manager_notes =
    body.manager_notes !== undefined ? (body.manager_notes === null ? null : String(body.manager_notes)) : call.manager_notes;
  const mr = body.manager_rating;
  const manager_rating =
    mr === undefined
      ? call.manager_rating
      : mr === null
        ? null
        : Math.min(5, Math.max(1, Math.round(Number(mr))));
  const conversion_tag =
    body.conversion_tag !== undefined ? parseTag(body.conversion_tag) : call.conversion_tag;
  const flagged_for_review =
    body.flagged_for_review !== undefined ? Boolean(body.flagged_for_review) : call.flagged_for_review;

  const reviewer = typeof body.reviewed_by === "string" && body.reviewed_by.trim() ? body.reviewed_by.trim() : "Manager";
  const stampReview = body.stamp_review !== false;

  updateCallManagerReview(id, {
    manager_notes,
    manager_rating: manager_rating != null && Number.isFinite(manager_rating) ? manager_rating : null,
    conversion_tag,
    flagged_for_review,
    reviewed_at: stampReview ? new Date().toISOString() : call.reviewed_at,
    reviewed_by: stampReview ? reviewer : call.reviewed_by,
  });

  return NextResponse.json({ ok: true });
}
