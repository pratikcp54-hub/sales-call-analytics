import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import type { CallRow, PerformanceScoresRow, QuestionnaireRow } from "@/lib/types";
import { removeUpload } from "@/lib/uploads";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  transcript TEXT,
  transcript_segments TEXT,
  agent_name TEXT,
  agent_talk_percent REAL,
  customer_talk_percent REAL,
  overall_score REAL,
  sentiment TEXT CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')),
  call_summary TEXT,
  positive_observations TEXT,
  negative_observations TEXT,
  action_items TEXT,
  keywords TEXT,
  extended_insights TEXT,
  manager_notes TEXT,
  manager_rating INTEGER,
  conversion_tag TEXT,
  flagged_for_review INTEGER DEFAULT 0,
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS performance_scores (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  communication_clarity INTEGER NOT NULL,
  politeness INTEGER NOT NULL,
  business_knowledge INTEGER NOT NULL,
  problem_handling INTEGER NOT NULL,
  listening_ability INTEGER NOT NULL,
  UNIQUE (call_id)
);

CREATE TABLE IF NOT EXISTS questionnaire_coverage (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  question_topic TEXT NOT NULL,
  was_asked INTEGER NOT NULL CHECK (was_asked IN (0, 1)),
  UNIQUE (call_id, question_topic)
);

CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls (status);
`;

let db: Database.Database | null = null;

export function getDbPath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
}

export function getDb(): Database.Database {
  if (db) return db;
  const file = getDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrateCallsTable(db);
  return db;
}

function migrateCallsTable(database: Database.Database): void {
  const cols = new Set(
    (database.prepare(`PRAGMA table_info(calls)`).all() as { name: string }[]).map((c) => c.name)
  );
  const add = (name: string, def: string) => {
    if (!cols.has(name)) {
      database.exec(`ALTER TABLE calls ADD COLUMN ${name} ${def}`);
      cols.add(name);
    }
  };
  add("extended_insights", "TEXT");
  add("manager_notes", "TEXT");
  add("manager_rating", "INTEGER");
  add("conversion_tag", "TEXT");
  add("flagged_for_review", "INTEGER DEFAULT 0");
  add("reviewed_at", "TEXT");
  add("reviewed_by", "TEXT");
}

function parseJson<T>(raw: string | null): T | null {
  if (raw == null || raw === "") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function rowToCall(row: Record<string, unknown>): CallRow {
  return {
    id: row.id as string,
    file_name: row.file_name as string,
    file_url: row.file_url as string,
    duration_seconds: row.duration_seconds as number | null,
    status: row.status as CallRow["status"],
    transcript: row.transcript as string | null,
    transcript_segments: parseJson<CallRow["transcript_segments"]>(row.transcript_segments as string | null),
    agent_name: row.agent_name as string | null,
    agent_talk_percent: row.agent_talk_percent as number | null,
    customer_talk_percent: row.customer_talk_percent as number | null,
    overall_score: row.overall_score as number | null,
    sentiment: row.sentiment as CallRow["sentiment"],
    call_summary: row.call_summary as string | null,
    positive_observations: parseJson<string[]>(row.positive_observations as string | null),
    negative_observations: parseJson<string[]>(row.negative_observations as string | null),
    action_items: parseJson<string[]>(row.action_items as string | null),
    keywords: parseJson<string[]>(row.keywords as string | null),
    extended_insights: parseJson<CallRow["extended_insights"]>(row.extended_insights as string | null),
    manager_notes: (row.manager_notes as string | null) ?? null,
    manager_rating: (row.manager_rating as number | null) ?? null,
    conversion_tag: parseConversionTag(row.conversion_tag),
    flagged_for_review: Boolean(row.flagged_for_review),
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

function parseConversionTag(raw: unknown): CallRow["conversion_tag"] {
  const v = String(raw ?? "");
  if (v === "converted" || v === "not_converted" || v === "follow_up_pending") return v;
  return null;
}

export function listCalls(): CallRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM calls ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(rowToCall);
}

export function getCallById(id: string): CallRow | null {
  const row = getDb().prepare(`SELECT * FROM calls WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? rowToCall(row) : null;
}

export function getCallFilePath(callId: string): string | null {
  const row = getDb().prepare(`SELECT file_url FROM calls WHERE id = ?`).get(callId) as { file_url: string } | undefined;
  return row?.file_url ?? null;
}

export function getCallBundle(callId: string): {
  call: CallRow;
  performance_scores: PerformanceScoresRow | null;
  questionnaire_coverage: QuestionnaireRow[];
} | null {
  const call = getCallById(callId);
  if (!call) return null;
  const scores = getDb()
    .prepare(`SELECT * FROM performance_scores WHERE call_id = ?`)
    .get(callId) as Record<string, unknown> | undefined;
  const qcRows = getDb()
    .prepare(`SELECT * FROM questionnaire_coverage WHERE call_id = ? ORDER BY question_topic`)
    .all(callId) as Record<string, unknown>[];

  const performance_scores = scores
    ? ({
        id: scores.id as string,
        call_id: scores.call_id as string,
        communication_clarity: scores.communication_clarity as number,
        politeness: scores.politeness as number,
        business_knowledge: scores.business_knowledge as number,
        problem_handling: scores.problem_handling as number,
        listening_ability: scores.listening_ability as number,
      } satisfies PerformanceScoresRow)
    : null;

  const questionnaire_coverage: QuestionnaireRow[] = qcRows.map((r) => ({
    id: r.id as string,
    call_id: r.call_id as string,
    question_topic: r.question_topic as string,
    was_asked: Boolean(r.was_asked),
  }));

  return { call, performance_scores, questionnaire_coverage };
}

export function insertCall(row: {
  id: string;
  file_name: string;
  file_url: string;
  status: CallRow["status"];
  agent_name: string | null;
}): void {
  const created = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO calls (id, file_name, file_url, status, agent_name, created_at)
       VALUES (@id, @file_name, @file_url, @status, @agent_name, @created_at)`
    )
    .run({ ...row, created_at: created });
}

export function updateCallStatus(callId: string, status: CallRow["status"]): void {
  getDb().prepare(`UPDATE calls SET status = ? WHERE id = ?`).run(status, callId);
}

export function updateCallTranscriptFields(
  callId: string,
  fields: {
    transcript: string;
    transcript_segments: string;
    duration_seconds: number | null;
    agent_talk_percent: number;
    customer_talk_percent: number;
  }
): void {
  getDb()
    .prepare(
      `UPDATE calls SET
        transcript = @transcript,
        transcript_segments = @transcript_segments,
        duration_seconds = @duration_seconds,
        agent_talk_percent = @agent_talk_percent,
        customer_talk_percent = @customer_talk_percent
      WHERE id = @id`
    )
    .run({ ...fields, id: callId });
}

export function updateCallCompleted(
  callId: string,
  fields: {
    overall_score: number;
    sentiment: string;
    call_summary: string;
    positive_observations: string;
    negative_observations: string;
    action_items: string;
    keywords: string;
    extended_insights: string;
  }
): void {
  getDb()
    .prepare(
      `UPDATE calls SET
        status = 'completed',
        overall_score = @overall_score,
        sentiment = @sentiment,
        call_summary = @call_summary,
        positive_observations = @positive_observations,
        negative_observations = @negative_observations,
        action_items = @action_items,
        keywords = @keywords,
        extended_insights = @extended_insights
      WHERE id = @id`
    )
    .run({ ...fields, id: callId });
}

export function replacePerformanceAndQuestionnaire(
  callId: string,
  performance: {
    communication_clarity: number;
    politeness: number;
    business_knowledge: number;
    problem_handling: number;
    listening_ability: number;
  },
  questionnaire: { question_topic: string; was_asked: boolean }[]
): void {
  const database = getDb();
  const delPerf = database.prepare(`DELETE FROM performance_scores WHERE call_id = ?`);
  const delQc = database.prepare(`DELETE FROM questionnaire_coverage WHERE call_id = ?`);
  const insPerf = database.prepare(
    `INSERT INTO performance_scores (id, call_id, communication_clarity, politeness, business_knowledge, problem_handling, listening_ability)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insQc = database.prepare(
    `INSERT INTO questionnaire_coverage (id, call_id, question_topic, was_asked) VALUES (?, ?, ?, ?)`
  );

  const run = database.transaction(() => {
    delPerf.run(callId);
    delQc.run(callId);
    insPerf.run(
      randomUUID(),
      callId,
      performance.communication_clarity,
      performance.politeness,
      performance.business_knowledge,
      performance.problem_handling,
      performance.listening_ability
    );
    for (const q of questionnaire) {
      insQc.run(randomUUID(), callId, q.question_topic, q.was_asked ? 1 : 0);
    }
  });
  run();
}

export function getCallStatus(callId: string): CallRow["status"] | null {
  const row = getDb().prepare(`SELECT status FROM calls WHERE id = ?`).get(callId) as { status: CallRow["status"] } | undefined;
  return row?.status ?? null;
}

/** Removes the call row (CASCADE deletes related rows), audio file, and upload directory. */
export function deleteCallById(callId: string): boolean {
  const row = getCallById(callId);
  if (!row) return false;
  removeUpload(row.file_url);
  const r = getDb().prepare(`DELETE FROM calls WHERE id = ?`).run(callId);
  return r.changes > 0;
}

export function updateCallManagerReview(
  callId: string,
  fields: {
    manager_notes: string | null;
    manager_rating: number | null;
    conversion_tag: CallRow["conversion_tag"];
    flagged_for_review: boolean;
    reviewed_at: string | null;
    reviewed_by: string | null;
  }
): void {
  getDb()
    .prepare(
      `UPDATE calls SET
        manager_notes = @manager_notes,
        manager_rating = @manager_rating,
        conversion_tag = @conversion_tag,
        flagged_for_review = @flagged_for_review,
        reviewed_at = @reviewed_at,
        reviewed_by = @reviewed_by
      WHERE id = @id`
    )
    .run({
      ...fields,
      flagged_for_review: fields.flagged_for_review ? 1 : 0,
      id: callId,
    });
}

export function listDistinctAgentNames(): string[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT TRIM(agent_name) AS n FROM calls
       WHERE agent_name IS NOT NULL AND TRIM(agent_name) != ''
       ORDER BY n COLLATE NOCASE`
    )
    .all() as { n: string }[];
  return rows.map((r) => r.n);
}

export function listCallsForAgent(agentName: string): CallRow[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM calls
       WHERE agent_name IS NOT NULL AND LOWER(TRIM(agent_name)) = LOWER(TRIM(?))
       ORDER BY datetime(created_at) DESC`
    )
    .all(agentName) as Record<string, unknown>[];
  return rows.map(rowToCall);
}
