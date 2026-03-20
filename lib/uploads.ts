import fs from "fs";
import path from "path";

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
}

/** `relative` is stored in DB (e.g. calls/{id}/file.mp3). */
export function absoluteUploadPath(relative: string): string {
  const root = getUploadRoot();
  const normalized = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(root, normalized);
}

export function saveUpload(relativePath: string, buffer: Buffer): void {
  const abs = absoluteUploadPath(relativePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buffer);
}

export function removeUpload(relativePath: string): void {
  const abs = absoluteUploadPath(relativePath);
  try {
    fs.unlinkSync(abs);
  } catch {
    /* ignore */
  }
  try {
    fs.rmSync(path.dirname(abs), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function mimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "application/octet-stream";
}
