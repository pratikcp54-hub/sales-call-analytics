import { NextRequest, NextResponse } from "next/server";
import { processCallById } from "@/lib/process-call";

/** Triggers transcription (AssemblyAI) + enriched coach analysis (Gemini/Claude). Prompt: `lib/analysis-prompt.ts`. */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const callId = body?.callId as string | undefined;
    if (!callId) {
      return NextResponse.json({ error: "callId required" }, { status: 400 });
    }

    const result = await processCallById(callId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Processing error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
