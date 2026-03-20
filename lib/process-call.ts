import fs from "fs/promises";
import { AssemblyAI } from "assemblyai";
import {
  getCallById,
  replacePerformanceAndQuestionnaire,
  updateCallCompleted,
  updateCallStatus,
  updateCallTranscriptFields,
} from "@/lib/db";
import { analyzeTranscript } from "@/lib/analyze-transcript";
import { extractExtendedInsights } from "@/lib/analysis-result";
import { computeTalkPercents, utterancesToSegments } from "@/lib/talk-time";
import { absoluteUploadPath } from "@/lib/uploads";

export async function processCallById(callId: string): Promise<{ ok: boolean; error?: string }> {
  const call = getCallById(callId);

  if (!call) {
    return { ok: false, error: "Call not found" };
  }

  if (call.status === "completed") {
    return { ok: true };
  }

  const audioPath = absoluteUploadPath(call.file_url);
  let audioBuffer: Buffer;
  try {
    audioBuffer = await fs.readFile(audioPath);
  } catch {
    updateCallStatus(callId, "failed");
    return { ok: false, error: "Audio file missing on disk" };
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    updateCallStatus(callId, "failed");
    return { ok: false, error: "Missing ASSEMBLYAI_API_KEY" };
  }

  const client = new AssemblyAI({ apiKey });

  const speechModels = (process.env.ASSEMBLYAI_SPEECH_MODELS ?? "universal-2")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!speechModels.length) {
    speechModels.push("universal-2");
  }

  try {
    const transcript = await client.transcripts.transcribe({
      audio: audioBuffer,
      speaker_labels: true,
      speech_models: speechModels,
    });

    if (transcript.status === "error") {
      throw new Error(transcript.error ?? "Transcription failed");
    }

    const text = transcript.text ?? "";
    const utterances = transcript.utterances ?? [];
    const segments = utterancesToSegments(utterances);
    const { agent, customer } = computeTalkPercents(utterances);

    const durationSeconds =
      transcript.audio_duration != null
        ? Math.round(transcript.audio_duration)
        : utterances.length
          ? Math.ceil(Math.max(...utterances.map((u) => u.end)) / 1000)
          : null;

    updateCallTranscriptFields(callId, {
      transcript: text,
      transcript_segments: JSON.stringify(segments),
      duration_seconds: durationSeconds,
      agent_talk_percent: agent,
      customer_talk_percent: customer,
    });

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const dur = durationSeconds ?? 0;
    const minutes = dur > 0 ? dur / 60 : 0;
    const wordsPerMinute = minutes > 0 ? Math.round(wordCount / minutes) : wordCount > 0 ? wordCount : 0;

    const analysis = await analyzeTranscript({
      transcript: text,
      agent_talk_percent: agent,
      customer_talk_percent: customer,
      duration_seconds: dur,
      words_per_minute: wordsPerMinute,
    });

    replacePerformanceAndQuestionnaire(callId, analysis.performance_scores, analysis.questionnaire_coverage);

    const extended = extractExtendedInsights(analysis);

    updateCallCompleted(callId, {
      overall_score: analysis.overall_score,
      sentiment: analysis.sentiment,
      call_summary: analysis.call_summary,
      positive_observations: JSON.stringify(analysis.positive_observations),
      negative_observations: JSON.stringify(analysis.negative_observations),
      action_items: JSON.stringify(analysis.action_items),
      keywords: JSON.stringify(analysis.keywords),
      extended_insights: JSON.stringify(extended),
    });

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Processing failed";
    updateCallStatus(callId, "failed");
    return { ok: false, error: msg };
  }
}
