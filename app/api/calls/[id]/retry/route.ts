import { NextRequest, NextResponse } from "next/server";
import { getCallStatus, updateCallStatus } from "@/lib/db";
import { processCallById } from "@/lib/process-call";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = getCallStatus(id);
  if (status == null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (status === "processing") {
    return NextResponse.json({ error: "Already processing" }, { status: 409 });
  }

  updateCallStatus(id, "processing");

  const result = await processCallById(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Retry failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
