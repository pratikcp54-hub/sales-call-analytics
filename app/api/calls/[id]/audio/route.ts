import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getCallFilePath } from "@/lib/db";
import { absoluteUploadPath, mimeFromName } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rel = getCallFilePath(id);
  if (!rel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const abs = absoluteUploadPath(rel);
  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = fs.readFileSync(abs);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": mimeFromName(rel),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
