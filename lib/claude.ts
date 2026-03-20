import Anthropic from "@anthropic-ai/sdk";
import { buildEnrichedCoachPrompt, type AnalysisPromptContext } from "@/lib/analysis-prompt";
import { parseAndNormalizeAnalysis } from "@/lib/analysis-result";
import type { ClaudeAnalysis } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export async function analyzeTranscriptWithClaude(ctx: AnalysisPromptContext): Promise<ClaudeAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildEnrichedCoachPrompt(ctx);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text");
  }

  const raw = extractJson(block.text);
  const parsed = JSON.parse(raw) as unknown;
  return parseAndNormalizeAnalysis(parsed);
}
