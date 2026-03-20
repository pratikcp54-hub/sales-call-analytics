import type { CallSentiment, ClaudeAnalysis, ExtendedCoachInsights } from "@/lib/types";

const FILLER_KEYS = ["um", "uh", "like", "basically", "you_know", "right", "honestly"] as const;

function normalizeSentiment(s: unknown): CallSentiment {
  const v = String(s ?? "neutral").toLowerCase();
  if (v === "positive" || v === "neutral" || v === "negative") return v;
  return "neutral";
}

function asNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: unknown): boolean {
  return v === true || v === "true";
}

function asStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

export function parseAndNormalizeAnalysis(raw: unknown): ClaudeAnalysis {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const perf = (o.performance_scores as Record<string, unknown> | undefined) ?? {};

  const fillerIn = (o.filler_word_count as Record<string, unknown> | undefined) ?? {};
  const filler_word_count: Record<string, number> = {};
  for (const k of FILLER_KEYS) {
    filler_word_count[k] = Math.max(0, Math.floor(asNum(fillerIn[k], 0)));
  }

  const objectionsRaw = Array.isArray(o.objections) ? o.objections : [];
  const objections = objectionsRaw.map((item) => {
    const x = item as Record<string, unknown>;
    return {
      type: String(x.type ?? "other"),
      customer_text: String(x.customer_text ?? ""),
      agent_response: String(x.agent_response ?? ""),
      handled_well: asBool(x.handled_well),
    };
  });

  const compRaw = Array.isArray(o.competitor_mentions) ? o.competitor_mentions : [];
  const competitor_mentions = compRaw.map((item) => {
    const x = item as Record<string, unknown>;
    return {
      name: String(x.name ?? ""),
      context: String(x.context ?? ""),
      agent_response: String(x.agent_response ?? ""),
    };
  });

  const emoRaw = Array.isArray(o.emotion_timeline) ? o.emotion_timeline : [];
  const emotion_timeline = emoRaw.map((item) => {
    const x = item as Record<string, unknown>;
    return {
      minute: Math.max(1, Math.floor(asNum(x.minute, 1))),
      sentiment: normalizeSentiment(x.sentiment),
      score: Math.min(1, Math.max(0, asNum(x.score, 0.5))),
    };
  });

  const qcRaw = Array.isArray(o.questionnaire_coverage) ? o.questionnaire_coverage : [];
  const questionnaire_coverage = qcRaw
    .map((item) => {
      const x = item as Record<string, unknown>;
      return {
        question_topic: String(x.question_topic ?? "").trim(),
        was_asked: asBool(x.was_asked),
      };
    })
    .filter((q) => q.question_topic.length > 0);

  return {
    overall_score: Math.min(10, Math.max(0, asNum(o.overall_score, 0))),
    sentiment: normalizeSentiment(o.sentiment),
    call_summary: String(o.call_summary ?? ""),
    performance_scores: {
      communication_clarity: Math.min(10, Math.max(1, Math.round(asNum(perf.communication_clarity, 5)))),
      politeness: Math.min(10, Math.max(1, Math.round(asNum(perf.politeness, 5)))),
      business_knowledge: Math.min(10, Math.max(1, Math.round(asNum(perf.business_knowledge, 5)))),
      problem_handling: Math.min(10, Math.max(1, Math.round(asNum(perf.problem_handling, 5)))),
      listening_ability: Math.min(10, Math.max(1, Math.round(asNum(perf.listening_ability, 5)))),
    },
    positive_observations: asStrArray(o.positive_observations),
    negative_observations: asStrArray(o.negative_observations),
    action_items: asStrArray(o.action_items),
    keywords: asStrArray(o.keywords),
    questionnaire_coverage,
    objections,
    competitor_mentions,
    emotion_timeline,
    customer_sentiment_start: normalizeSentiment(o.customer_sentiment_start),
    customer_sentiment_end: normalizeSentiment(o.customer_sentiment_end),
    filler_word_count,
    coaching_tips: asStrArray(o.coaching_tips),
    best_moments: asStrArray(o.best_moments),
    missed_opportunities: asStrArray(o.missed_opportunities),
    conversion_probability: Math.min(1, Math.max(0, asNum(o.conversion_probability, 0))),
    question_quality_score: Math.min(10, Math.max(1, Math.round(asNum(o.question_quality_score, 5)))),
    question_quality_notes: String(o.question_quality_notes ?? ""),
    next_best_action: String(o.next_best_action ?? ""),
  };
}

export function extractExtendedInsights(analysis: ClaudeAnalysis): ExtendedCoachInsights {
  return {
    objections: analysis.objections ?? [],
    competitor_mentions: analysis.competitor_mentions ?? [],
    emotion_timeline: analysis.emotion_timeline ?? [],
    customer_sentiment_start: analysis.customer_sentiment_start ?? "neutral",
    customer_sentiment_end: analysis.customer_sentiment_end ?? "neutral",
    filler_word_count: analysis.filler_word_count ?? {},
    coaching_tips: analysis.coaching_tips ?? [],
    best_moments: analysis.best_moments ?? [],
    missed_opportunities: analysis.missed_opportunities ?? [],
    conversion_probability: analysis.conversion_probability ?? 0,
    question_quality_score: analysis.question_quality_score ?? 5,
    question_quality_notes: analysis.question_quality_notes ?? "",
    next_best_action: analysis.next_best_action ?? "",
  };
}
