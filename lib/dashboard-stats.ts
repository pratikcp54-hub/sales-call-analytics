import type { CallRow, CallSentiment } from "@/lib/types";

export type DashboardStats = {
  totalCalls: number;
  avgScore: number | null;
  sentiment: Record<CallSentiment, number>;
  avgDurationMinutes: number | null;
  topKeywords: { word: string; count: number }[];
  actionItemsTotal: number;
  /** Avg conversion 0–1 from extended insights, completed calls only */
  avgConversionRate: number | null;
  /** Avg question quality 1–10 */
  avgQuestionQuality: number | null;
  /** Sum of objections across completed calls with insights */
  objectionsTracked: number;
  /** Sum of coaching tips across completed calls with insights */
  coachingTipsTracked: number;
};

export type DashboardExtras = {
  needsReviewCount: number;
  highPerformerCount: number;
  flaggedCount: number;
};

function normalizeKeyword(k: string): string {
  return k.trim().toLowerCase();
}

export function computeDashboardStats(calls: CallRow[]): DashboardStats {
  const totalCalls = calls.length;
  const completed = calls.filter((c) => c.status === "completed");

  const scores = completed.map((c) => c.overall_score).filter((s): s is number => s != null);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const sentiment: Record<CallSentiment, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  for (const c of completed) {
    if (c.sentiment) sentiment[c.sentiment] += 1;
  }

  const durations = completed.map((c) => c.duration_seconds).filter((d): d is number => d != null && d > 0);
  const avgDurationMinutes = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length / 60
    : null;

  const kwCount = new Map<string, number>();
  for (const c of completed) {
    for (const raw of c.keywords ?? []) {
      const w = normalizeKeyword(raw);
      if (!w) continue;
      kwCount.set(w, (kwCount.get(w) ?? 0) + 1);
    }
  }
  const topKeywords = Array.from(kwCount.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const actionItemsTotal = completed.reduce((acc, c) => acc + (c.action_items?.length ?? 0), 0);

  const withExt = completed.filter((c) => c.extended_insights != null);
  const conv = withExt
    .map((c) => c.extended_insights!.conversion_probability)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const avgConversionRate = conv.length ? conv.reduce((a, b) => a + b, 0) / conv.length : null;

  const qq = withExt
    .map((c) => c.extended_insights!.question_quality_score)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const avgQuestionQuality = qq.length ? qq.reduce((a, b) => a + b, 0) / qq.length : null;

  const objectionsTracked = withExt.reduce((acc, c) => acc + (c.extended_insights?.objections?.length ?? 0), 0);
  const coachingTipsTracked = withExt.reduce((acc, c) => acc + (c.extended_insights?.coaching_tips?.length ?? 0), 0);

  return {
    totalCalls,
    avgScore,
    sentiment,
    avgDurationMinutes,
    topKeywords,
    actionItemsTotal,
    avgConversionRate,
    avgQuestionQuality,
    objectionsTracked,
    coachingTipsTracked,
  };
}

export function computeDashboardExtras(calls: CallRow[]): DashboardExtras {
  const completed = calls.filter((c) => c.status === "completed");
  const needsReviewCount = completed.filter((c) => c.overall_score != null && c.overall_score < 6).length;
  const highPerformerCount = completed.filter((c) => c.overall_score != null && c.overall_score >= 8).length;
  const flaggedCount = completed.filter((c) => c.flagged_for_review).length;
  return { needsReviewCount, highPerformerCount, flaggedCount };
}
