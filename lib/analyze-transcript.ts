import type { AnalysisPromptContext } from "@/lib/analysis-prompt";
import { analyzeTranscriptWithClaude } from "@/lib/claude";
import { analyzeTranscriptWithGemini } from "@/lib/gemini-analysis";
import type { ClaudeAnalysis } from "@/lib/types";

type LlmProvider = "gemini" | "anthropic";

function resolveProvider(): LlmProvider {
  const explicit = process.env.LLM_PROVIDER?.toLowerCase();
  if (explicit === "anthropic") return "anthropic";
  if (explicit === "gemini") return "gemini";

  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";

  throw new Error(
    "No LLM API key: set GEMINI_API_KEY (free: Google AI Studio) and/or ANTHROPIC_API_KEY, or LLM_PROVIDER=gemini|anthropic"
  );
}

/** Sales-call JSON analysis using Gemini (default if GEMINI_API_KEY set) or Anthropic. */
export async function analyzeTranscript(ctx: AnalysisPromptContext): Promise<ClaudeAnalysis> {
  const provider = resolveProvider();
  if (provider === "gemini") {
    return analyzeTranscriptWithGemini(ctx);
  }
  return analyzeTranscriptWithClaude(ctx);
}
