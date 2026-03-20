import type { CallRow } from "@/lib/types";

export type ImprovementInsightsSections = {
  negatives: string[];
  missed: string[];
};

/** Structured negative observations + missed opportunities (completed calls only). */
export function improvementInsightsSections(c: CallRow): ImprovementInsightsSections {
  if (c.status !== "completed") return { negatives: [], missed: [] };
  const negatives = (c.negative_observations ?? []).map((s) => s.trim()).filter(Boolean);
  const missed = (c.extended_insights?.missed_opportunities ?? []).map((s) => s.trim()).filter(Boolean);
  return { negatives, missed };
}

/**
 * Flattened for CSV / sort: prefer negatives, else missed opportunities.
 * Empty string if not completed or nothing was flagged.
 */
export function improvementInsightsText(c: CallRow): string {
  const { negatives, missed } = improvementInsightsSections(c);
  if (negatives.length) return negatives.join(" · ");
  if (missed.length) return missed.join(" · ");
  return "";
}
