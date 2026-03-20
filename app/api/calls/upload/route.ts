import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { insertCall } from "@/lib/db";
import { removeUpload, saveUpload } from "@/lib/uploads";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/webm"]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const agentName = (form.get("agentName") as string | null)?.trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!ALLOWED.has(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
      return NextResponse.json({ error: "Unsupported audio type" }, { status: 400 });
    }

    const id = randomUUID();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const objectPath = `calls/${id}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      saveUpload(objectPath, buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save file";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    try {
      insertCall({
        id,
        file_name: file.name,
        file_url: objectPath,
        status: "processing",
        agent_name: agentName,
      });
    } catch (e) {
      removeUpload(objectPath);
      const msg = e instanceof Error ? e.message : "Insert failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ callId: id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
