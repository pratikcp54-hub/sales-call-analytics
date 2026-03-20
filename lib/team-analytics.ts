import { getDb } from "@/lib/db";
import type { CallRow, ExtendedCoachInsights, PerformanceScoresRow } from "@/lib/types";
import { detectAgentMonologues } from "@/lib/monologue";

export type PeriodFilter = "week" | "month" | "all";

const DIMS = [
  "communication_clarity",
  "politeness",
  "business_knowledge",
  "problem_handling",
  "listening_ability",
] as const;

export type DimKey = (typeof DIMS)[number];

export function periodSqlClause(period: PeriodFilter): string {
  if (period === "all") return "";
  if (period === "week") return `AND datetime(created_at) >= datetime('now', '-7 days')`;
  return `AND datetime(created_at) >= datetime('now', '-30 days')`;
}

function parseExt(raw: string | null): ExtendedCoachInsights | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtendedCoachInsights;
  } catch {
    return null;
  }
}

function avgDims(rows: PerformanceScoresRow[]): Record<DimKey, number> {
  const z = { communication_clarity: 0, politeness: 0, business_knowledge: 0, problem_handling: 0, listening_ability: 0 };
  if (!rows.length) return z;
  for (const r of rows) {
    for (const k of DIMS) z[k] += r[k];
  }
  const n = rows.length;
  for (const k of DIMS) z[k] = Math.round((z[k] / n) * 10) / 10;
  return z;
}

export function getTeamRadarAverages(): Record<DimKey, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ps.* FROM performance_scores ps
       INNER JOIN calls c ON c.id = ps.call_id AND c.status = 'completed'`
    )
    .all() as PerformanceScoresRow[];
  return avgDims(rows);
}

export function getAgentRadarAverages(agentName: string): Record<DimKey, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ps.* FROM performance_scores ps
       INNER JOIN calls c ON c.id = ps.call_id AND c.status = 'completed'
       WHERE LOWER(TRIM(c.agent_name)) = LOWER(TRIM(?))`
    )
    .all(agentName) as PerformanceScoresRow[];
  return avgDims(rows);
}

export type WeeklyPoint = { weekLabel: string; avgScore: number };

export function getWeeklyAvgScores(agentName: string, numWeeks: number): WeeklyPoint[] {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - numWeeks * 7);
  const rows = db
    .prepare(
      `SELECT c.overall_score, c.created_at FROM calls c
       WHERE c.status = 'completed' AND c.overall_score IS NOT NULL
       AND LOWER(TRIM(c.agent_name)) = LOWER(TRIM(?))
       AND datetime(c.created_at) >= datetime(?)`
    )
    .all(agentName, cutoff.toISOString()) as { overall_score: number; created_at: string }[];

  const byWeek = new Map<string, number[]>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const y = d.getFullYear();
    const wk = weekNumber(d);
    const key = `${y}-W${String(wk).padStart(2, "0")}`;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(r.overall_score);
  }
  const points: WeeklyPoint[] = Array.from(byWeek.entries())
    .map(([weekLabel, scores]) => ({
      weekLabel,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => a.weekLabel.localeCompare(b.weekLabel))
    .slice(-numWeeks);
  return points;
}

function weekNumber(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

export type DimOverTimeRow = {
  callId: string;
  created_at: string;
  scores: Record<DimKey, number>;
};

export function getDimensionScoresLastNCalls(agentName: string, n: number): DimOverTimeRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.id, c.created_at, ps.communication_clarity, ps.politeness, ps.business_knowledge,
        ps.problem_handling, ps.listening_ability
       FROM calls c
       INNER JOIN performance_scores ps ON ps.call_id = c.id
       WHERE c.status = 'completed' AND LOWER(TRIM(c.agent_name)) = LOWER(TRIM(?))
       ORDER BY datetime(c.created_at) DESC LIMIT ?`
    )
    .all(agentName, n) as Record<string, unknown>[];

  return rows.map((r) => ({
    callId: r.id as string,
    created_at: r.created_at as string,
    scores: {
      communication_clarity: r.communication_clarity as number,
      politeness: r.politeness as number,
      business_knowledge: r.business_knowledge as number,
      problem_handling: r.problem_handling as number,
      listening_ability: r.listening_ability as number,
    },
  })).reverse();
}

export function getTalkPercentByCall(agentName: string): { id: string; created_at: string; agentTalk: number }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, created_at, agent_talk_percent FROM calls
       WHERE status = 'completed' AND agent_talk_percent IS NOT NULL
       AND LOWER(TRIM(agent_name)) = LOWER(TRIM(?))
       ORDER BY datetime(created_at) ASC`
    )
    .all(agentName) as { id: string; created_at: string; agent_talk_percent: number }[];
  return rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    agentTalk: r.agent_talk_percent,
  }));
}

export function aggregateFillerForAgent(agentName: string): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT extended_insights FROM calls WHERE status = 'completed'
       AND LOWER(TRIM(agent_name)) = LOWER(TRIM(?)) AND extended_insights IS NOT NULL`
    )
    .all(agentName) as { extended_insights: string }[];
  const totals: Record<string, number> = {};
  for (const { extended_insights } of rows) {
    const ext = parseExt(extended_insights);
    if (!ext?.filler_word_count) continue;
    for (const [k, v] of Object.entries(ext.filler_word_count)) {
      totals[k] = (totals[k] ?? 0) + (typeof v === "number" ? v : 0);
    }
  }
  return totals;
}

export function getMonologueCountsForAgent(agentName: string): { callId: string; count: number }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, transcript_segments FROM calls WHERE status = 'completed'
       AND LOWER(TRIM(agent_name)) = LOWER(TRIM(?)) AND transcript_segments IS NOT NULL`
    )
    .all(agentName) as { id: string; transcript_segments: string }[];
  const out: { callId: string; count: number }[] = [];
  for (const r of rows) {
    try {
      const segs = JSON.parse(r.transcript_segments) as CallRow["transcript_segments"];
      const n = detectAgentMonologues(segs).length;
      if (n > 0) out.push({ callId: r.id, count: n });
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Last N completed calls (chronological order for charts), including zero monologue counts. */
export function getMonologueCountsLastNCalls(agentName: string, n: number): { callId: string; idx: number; count: number }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, transcript_segments FROM calls WHERE status = 'completed'
       AND LOWER(TRIM(agent_name)) = LOWER(TRIM(?)) AND transcript_segments IS NOT NULL
       ORDER BY datetime(created_at) DESC LIMIT ?`
    )
    .all(agentName, n) as { id: string; transcript_segments: string }[];
  const out: { callId: string; idx: number; count: number }[] = [];
  let i = 0;
  for (const r of rows.reverse()) {
    i += 1;
    try {
      const segs = JSON.parse(r.transcript_segments) as CallRow["transcript_segments"];
      out.push({ callId: r.id, idx: i, count: detectAgentMonologues(segs).length });
    } catch {
      out.push({ callId: r.id, idx: i, count: 0 });
    }
  }
  return out;
}

export function getTeamSentimentCounts(period: PeriodFilter): { positive: number; neutral: number; negative: number } {
  const clause = periodSqlClause(period);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT sentiment FROM calls WHERE status = 'completed' AND sentiment IS NOT NULL ${clause}`
    )
    .all() as { sentiment: string }[];
  const o = { positive: 0, neutral: 0, negative: 0 };
  for (const r of rows) {
    if (r.sentiment === "positive") o.positive += 1;
    else if (r.sentiment === "neutral") o.neutral += 1;
    else if (r.sentiment === "negative") o.negative += 1;
  }
  return o;
}

export function aggregateObjectionsForPeriod(period: PeriodFilter): { type: string; count: number }[] {
  const clause = periodSqlClause(period);
  const db = getDb();
  const rows = db
    .prepare(`SELECT extended_insights FROM calls WHERE status = 'completed' AND extended_insights IS NOT NULL ${clause}`)
    .all() as { extended_insights: string }[];
  const counts = new Map<string, number>();
  for (const { extended_insights } of rows) {
    const ext = parseExt(extended_insights);
    if (!ext?.objections?.length) continue;
    for (const o of ext.objections) {
      const t = (o.type || "other").toLowerCase();
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export type CompetitorIntelRow = {
  name: string;
  mentions: number;
  contextTypes: string;
  winRatePct: number | null;
  commonObjections: string;
  trendVsLastMonth: "up" | "down" | "flat";
};

export function buildCompetitorIntelligence(): CompetitorIntelRow[] {
  const db = getDb();
  const thisMonth = db
    .prepare(
      `SELECT id, extended_insights, conversion_tag FROM calls WHERE status = 'completed' AND extended_insights IS NOT NULL
       AND datetime(created_at) >= datetime('now', '-30 days')`
    )
    .all() as { id: string; extended_insights: string; conversion_tag: string | null }[];
  const lastMonth = db
    .prepare(
      `SELECT extended_insights FROM calls WHERE status = 'completed' AND extended_insights IS NOT NULL
       AND datetime(created_at) >= datetime('now', '-60 days') AND datetime(created_at) < datetime('now', '-30 days')`
    )
    .all() as { extended_insights: string }[];

  const byName = new Map<
    string,
    { mentions: number; ctx: Set<string>; callIds: Set<string>; wins: number; tagged: number; objections: string[] }
  >();
  const countsPrev = new Map<string, number>();

  for (const { extended_insights } of lastMonth) {
    const ext = parseExt(extended_insights);
    if (!ext?.competitor_mentions?.length) continue;
    const names = new Set<string>();
    for (const c of ext.competitor_mentions) {
      const name = (c.name || "Unknown").trim();
      if (name) names.add(name);
    }
    for (const name of Array.from(names)) {
      countsPrev.set(name, (countsPrev.get(name) ?? 0) + 1);
    }
  }

  for (const row of thisMonth) {
    const ext = parseExt(row.extended_insights);
    if (!ext?.competitor_mentions?.length) continue;
    const namesThisCall = new Set<string>();
    for (const c of ext.competitor_mentions) {
      const name = (c.name || "Unknown").trim();
      if (!name) continue;
      namesThisCall.add(name);
    }
    for (const name of Array.from(namesThisCall)) {
      if (!byName.has(name))
        byName.set(name, { mentions: 0, ctx: new Set(), callIds: new Set(), wins: 0, tagged: 0, objections: [] });
      const b = byName.get(name)!;
      b.mentions += 1;
      b.callIds.add(row.id);
      const tag = row.conversion_tag;
      if (tag === "converted" || tag === "not_converted") {
        b.tagged += 1;
        if (tag === "converted") b.wins += 1;
      }
      for (const c of ext.competitor_mentions) {
        if ((c.name || "Unknown").trim() === name && c.context) {
          b.ctx.add(c.context.split(/\s+/).slice(0, 4).join(" ").slice(0, 40));
          break;
        }
      }
    }
    const o0 = ext.objections?.[0];
    const firstName = Array.from(namesThisCall)[0];
    if (o0?.customer_text && firstName) {
      const b0 = byName.get(firstName);
      if (b0 && b0.objections.length < 5) b0.objections.push(o0.customer_text.slice(0, 80));
    }
  }

  return Array.from(byName.entries())
    .map(([name, v]) => {
      const prev = countsPrev.get(name) ?? 0;
      const cur = v.mentions;
      let trendVsLastMonth: "up" | "down" | "flat" = "flat";
      if (cur > prev) trendVsLastMonth = "up";
      else if (cur < prev) trendVsLastMonth = "down";
      const winRatePct = v.tagged ? Math.round((v.wins / v.tagged) * 100) : null;
      return {
        name,
        mentions: v.mentions,
        contextTypes: Array.from(v.ctx).slice(0, 4).join(" · ") || "—",
        winRatePct,
        commonObjections: v.objections.slice(0, 2).join(" · ") || "—",
        trendVsLastMonth,
      };
    })
    .sort((a, b) => b.mentions - a.mentions);
}


export type LeaderboardRow = {
  rank: number;
  agentName: string;
  avgScore: number;
  totalCalls: number;
  avgTalkRatio: number;
  topStrength: DimKey;
  improvementArea: DimKey;
  trend: "up" | "down" | "flat";
  conversionRate: number | null;
};

export function getLeaderboard(period: PeriodFilter): LeaderboardRow[] {
  const db = getDb();
  const clause = periodSqlClause(period);
  const agents = db
    .prepare(
      `SELECT TRIM(agent_name) AS name FROM calls
       WHERE status = 'completed' AND agent_name IS NOT NULL AND TRIM(agent_name) != ''
       ${clause}
       GROUP BY LOWER(TRIM(agent_name))`
    )
    .all() as { name: string }[];

  const prevClause =
    period === "all"
      ? ""
      : period === "week"
        ? `AND datetime(created_at) >= datetime('now', '-14 days') AND datetime(created_at) < datetime('now', '-7 days')`
        : `AND datetime(created_at) >= datetime('now', '-60 days') AND datetime(created_at) < datetime('now', '-30 days')`;

  const rows: LeaderboardRow[] = [];
  for (const { name } of agents) {
    const cur = db
      .prepare(
        `SELECT c.overall_score, c.agent_talk_percent, c.conversion_tag,
          ps.communication_clarity, ps.politeness, ps.business_knowledge, ps.problem_handling, ps.listening_ability, ps.call_id
         FROM calls c
         INNER JOIN performance_scores ps ON ps.call_id = c.id
         WHERE c.status = 'completed' AND LOWER(TRIM(c.agent_name)) = LOWER(TRIM(?)) ${clause}`
      )
      .all(name) as {
        overall_score: number | null;
        agent_talk_percent: number | null;
        conversion_tag: string | null;
        communication_clarity: number;
        politeness: number;
        business_knowledge: number;
        problem_handling: number;
        listening_ability: number;
        call_id: string;
      }[];

    if (!cur.length) continue;
    const scores = cur.map((r) => r.overall_score).filter((s): s is number => s != null);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const talks = cur.map((r) => r.agent_talk_percent).filter((t): t is number => t != null);
    const avgTalk = talks.length ? talks.reduce((a, b) => a + b, 0) / talks.length : 0;
    const dimAvgs = avgDims(
      cur.map((r) => ({
        id: "",
        call_id: r.call_id,
        communication_clarity: r.communication_clarity,
        politeness: r.politeness,
        business_knowledge: r.business_knowledge,
        problem_handling: r.problem_handling,
        listening_ability: r.listening_ability,
      }))
    );
    let top: DimKey = "communication_clarity";
    let low: DimKey = "communication_clarity";
    for (const k of DIMS) {
      if (dimAvgs[k] > dimAvgs[top]) top = k;
      if (dimAvgs[k] < dimAvgs[low]) low = k;
    }
    const tagged = cur.filter((r) => r.conversion_tag === "converted" || r.conversion_tag === "not_converted");
    const converted = cur.filter((r) => r.conversion_tag === "converted").length;
    const conversionRate = tagged.length ? converted / tagged.length : null;

    const prev = db
      .prepare(
        `SELECT AVG(c.overall_score) AS a FROM calls c
         WHERE c.status = 'completed' AND LOWER(TRIM(c.agent_name)) = LOWER(TRIM(?)) ${prevClause}`
      )
      .get(name) as { a: number | null } | undefined;
    const prevAvg = prev?.a ?? null;
    let trend: "up" | "down" | "flat" = "flat";
    if (prevAvg != null && Number.isFinite(prevAvg)) {
      if (avgScore > prevAvg + 0.2) trend = "up";
      else if (avgScore < prevAvg - 0.2) trend = "down";
    }

    rows.push({
      rank: 0,
      agentName: name,
      avgScore,
      totalCalls: cur.length,
      avgTalkRatio: avgTalk,
      topStrength: top,
      improvementArea: low,
      trend,
      conversionRate,
    });
  }

  rows.sort((a, b) => b.avgScore - a.avgScore);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

export function teamHealthScore(period: PeriodFilter): { score: number; delta: number | null } {
  const clause = periodSqlClause(period);
  const db = getDb();
  const cur = db
    .prepare(
      `SELECT AVG(overall_score) AS a FROM calls WHERE status = 'completed' AND overall_score IS NOT NULL ${clause}`
    )
    .get() as { a: number | null };
  const score = cur.a != null ? Math.round(cur.a * 10) / 10 : 0;
  if (period === "all") return { score, delta: null };
  const prevClause =
    period === "week"
      ? `AND datetime(created_at) >= datetime('now', '-14 days') AND datetime(created_at) < datetime('now', '-7 days')`
      : `AND datetime(created_at) >= datetime('now', '-60 days') AND datetime(created_at) < datetime('now', '-30 days')`;
  const prev = db
    .prepare(`SELECT AVG(overall_score) AS a FROM calls WHERE status = 'completed' AND overall_score IS NOT NULL ${prevClause}`)
    .get() as { a: number | null };
  const delta =
    cur.a != null && prev.a != null ? Math.round((cur.a - prev.a) * 10) / 10 : null;
  return { score, delta };
}

export function getGoldenCall(period: PeriodFilter): {
  id: string;
  agent_name: string | null;
  overall_score: number;
  created_at: string;
  call_summary: string | null;
} | null {
  const clause = periodSqlClause(period);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, agent_name, overall_score, created_at, call_summary FROM calls
       WHERE status = 'completed' AND overall_score IS NOT NULL ${clause}
       ORDER BY overall_score DESC, datetime(created_at) DESC LIMIT 1`
    )
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    agent_name: row.agent_name as string | null,
    overall_score: row.overall_score as number,
    created_at: row.created_at as string,
    call_summary: row.call_summary as string | null,
  };
}

export type ObjectionLibRow = {
  category: string;
  count: number;
  handledPct: number;
  example: string;
};

export function buildObjectionLibrary(): ObjectionLibRow[] {
  const db = getDb();
  const rows = db.prepare(`SELECT extended_insights FROM calls WHERE status = 'completed' AND extended_insights IS NOT NULL`).all() as {
    extended_insights: string;
  }[];
  const byCat = new Map<string, { total: number; handled: number; examples: string[] }>();
  for (const { extended_insights } of rows) {
    const ext = parseExt(extended_insights);
    if (!ext?.objections?.length) continue;
    for (const o of ext.objections) {
      const cat = (o.type || "other").toLowerCase();
      if (!byCat.has(cat)) byCat.set(cat, { total: 0, handled: 0, examples: [] });
      const b = byCat.get(cat)!;
      b.total += 1;
      if (o.handled_well) b.handled += 1;
      if (o.agent_response && b.examples.length < 3) b.examples.push(o.agent_response);
    }
  }
  return Array.from(byCat.entries()).map(([category, v]) => ({
    category,
    count: v.total,
    handledPct: v.total ? Math.round((v.handled / v.total) * 100) : 0,
    example: v.examples[0] ?? "—",
  }));
}

export type CompetitorAggRow = {
  name: string;
  mentions: number;
  contexts: string;
};

export function buildCompetitorAggregates(): CompetitorAggRow[] {
  const db = getDb();
  const rows = db.prepare(`SELECT extended_insights FROM calls WHERE status = 'completed' AND extended_insights IS NOT NULL`).all() as {
    extended_insights: string;
  }[];
  const map = new Map<string, { n: number; ctx: Set<string> }>();
  for (const { extended_insights } of rows) {
    const ext = parseExt(extended_insights);
    if (!ext?.competitor_mentions?.length) continue;
    for (const c of ext.competitor_mentions) {
      const name = (c.name || "Unknown").trim();
      if (!map.has(name)) map.set(name, { n: 0, ctx: new Set() });
      const m = map.get(name)!;
      m.n += 1;
      if (c.context) m.ctx.add(c.context.slice(0, 80));
    }
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      mentions: v.n,
      contexts: Array.from(v.ctx).slice(0, 3).join(" · ") || "—",
    }))
    .sort((a, b) => b.mentions - a.mentions);
}

export type MissedOppRow = {
  id: string;
  agent_name: string | null;
  created_at: string;
  overall_score: number | null;
  startSentiment: string;
  missed: string[];
};

export function getMissedOpportunityCalls(): MissedOppRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, agent_name, created_at, overall_score, extended_insights FROM calls
       WHERE status = 'completed' AND overall_score IS NOT NULL AND overall_score < 6 AND extended_insights IS NOT NULL`
    )
    .all() as Record<string, unknown>[];
  const out: MissedOppRow[] = [];
  for (const r of rows) {
    const ext = parseExt(r.extended_insights as string);
    if (!ext || ext.customer_sentiment_start !== "positive") continue;
    out.push({
      id: r.id as string,
      agent_name: r.agent_name as string | null,
      created_at: r.created_at as string,
      overall_score: r.overall_score as number,
      startSentiment: ext.customer_sentiment_start,
      missed: (ext.missed_opportunities ?? []).slice(0, 2),
    });
  }
  return out.sort((a, b) => (a.overall_score ?? 0) - (b.overall_score ?? 0));
}

export type ScatterPoint = { agent: string; callsPerWeek: number; avgScore: number };

export function getVolumeVsQualityScatter(): ScatterPoint[] {
  const db = getDb();
  const agents = db
    .prepare(
      `SELECT TRIM(agent_name) AS name FROM calls
       WHERE status = 'completed' AND agent_name IS NOT NULL AND TRIM(agent_name) != ''
       GROUP BY LOWER(TRIM(agent_name))`
    )
    .all() as { name: string }[];
  const out: ScatterPoint[] = [];
  const weekMs = 7 * 86400000;
  const now = Date.now();
  for (const { name } of agents) {
    const calls = db
      .prepare(
        `SELECT created_at, overall_score FROM calls
         WHERE status = 'completed' AND LOWER(TRIM(agent_name)) = LOWER(TRIM(?))
         AND datetime(created_at) >= datetime('now', '-56 days')`
      )
      .all(name) as { created_at: string; overall_score: number | null }[];
    if (calls.length < 1) continue;
    const first = Math.min(...calls.map((c) => new Date(c.created_at).getTime()));
    const weeks = Math.max(1, (now - first) / weekMs);
    const scores = calls.map((c) => c.overall_score).filter((s): s is number => s != null);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    out.push({ agent: name, callsPerWeek: calls.length / weeks, avgScore });
  }
  return out;
}

export function conversionComparison(): {
  converted: { avgScore: number; avgTalk: number; questionsCovered: string; objectionsHandledPct: number };
  notConverted: { avgScore: number; avgTalk: number; questionsCovered: string; objectionsHandledPct: number };
  convertedN: number;
  notN: number;
} {
  const db = getDb();
  const conv = db
    .prepare(
      `SELECT c.id, c.overall_score, c.agent_talk_percent, c.extended_insights,
        (SELECT COUNT(*) FROM questionnaire_coverage q WHERE q.call_id = c.id AND q.was_asked = 1) AS qyes,
        (SELECT COUNT(*) FROM questionnaire_coverage q WHERE q.call_id = c.id) AS qtot
       FROM calls c WHERE c.status = 'completed' AND c.conversion_tag = 'converted'`
    )
    .all() as Record<string, unknown>[];
  const notC = db
    .prepare(
      `SELECT c.id, c.overall_score, c.agent_talk_percent, c.extended_insights,
        (SELECT COUNT(*) FROM questionnaire_coverage q WHERE q.call_id = c.id AND q.was_asked = 1) AS qyes,
        (SELECT COUNT(*) FROM questionnaire_coverage q WHERE q.call_id = c.id) AS qtot
       FROM calls c WHERE c.status = 'completed' AND c.conversion_tag = 'not_converted'`
    )
    .all() as Record<string, unknown>[];

  function pack(rows: Record<string, unknown>[]) {
    if (!rows.length) {
      return { avgScore: 0, avgTalk: 0, questionsCovered: "—", objectionsHandledPct: 0 };
    }
    const scores = rows.map((r) => r.overall_score as number).filter((n) => n != null);
    const talks = rows.map((r) => r.agent_talk_percent as number).filter((n) => n != null);
    let handled = 0;
    let obj = 0;
    let qSum = 0;
    let qTot = 0;
    for (const r of rows) {
      const ext = parseExt(r.extended_insights as string);
      if (ext?.objections?.length) {
        for (const o of ext.objections) {
          obj += 1;
          if (o.handled_well) handled += 1;
        }
      }
      qSum += Number(r.qyes ?? 0);
      qTot += Number(r.qtot ?? 0);
    }
    return {
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      avgTalk: talks.length ? talks.reduce((a, b) => a + b, 0) / talks.length : 0,
      questionsCovered: qTot ? `${Math.round(qSum / rows.length)}/${Math.round(qTot / rows.length)}` : "—",
      objectionsHandledPct: obj ? Math.round((handled / obj) * 100) : 0,
    };
  }

  return {
    converted: pack(conv),
    notConverted: pack(notC),
    convertedN: conv.length,
    notN: notC.length,
  };
}

export function topObjectionThisWeek(): { type: string; count: number } | null {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT extended_insights FROM calls WHERE status = 'completed'
       AND datetime(created_at) >= datetime('now', '-7 days') AND extended_insights IS NOT NULL`
    )
    .all() as { extended_insights: string }[];
  const counts = new Map<string, number>();
  for (const { extended_insights } of rows) {
    const ext = parseExt(extended_insights);
    if (!ext?.objections?.length) continue;
    for (const o of ext.objections) {
      const t = (o.type || "other").toLowerCase();
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  let best: { type: string; count: number } | null = null;
  for (const [type, count] of Array.from(counts.entries())) {
    if (!best || count > best.count) best = { type, count };
  }
  return best;
}
