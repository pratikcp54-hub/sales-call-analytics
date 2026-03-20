"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPT = ".mp3,.wav,.m4a,.ogg,audio/*";

export function UploadCallForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [agentName, setAgentName] = useState("");
  const [drag, setDrag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Choose an audio file");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (agentName.trim()) fd.append("agentName", agentName.trim());
      const res = await fetch("/api/calls/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Upload failed");
        return;
      }
      toast.success("Upload complete — starting analysis");
      router.push(`/calls/${json.callId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Upload call recording</CardTitle>
        <CardDescription>MP3, WAV, M4A, or OGG. Files stay on this server under ./data/uploads.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn(
              "rounded-xl border-2 border-dashed p-10 text-center transition-colors",
              drag ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
          >
            <Upload className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Drag and drop audio here, or</p>
            <Label className="mt-2 inline-block cursor-pointer">
              <span className="text-sm font-medium text-primary underline">browse files</span>
              <Input
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Label>
            {file && <p className="mt-3 text-sm font-medium text-foreground">{file.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent">Agent name (optional)</Label>
            <Input
              id="agent"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Jordan Smith"
            />
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Pipeline</p>
            <ol className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <li className={submitting ? "font-medium text-foreground" : ""}>1. Uploading</li>
              <li>2. Transcribing</li>
              <li>3. Analyzing</li>
              <li>4. Complete</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              After upload you&apos;ll be taken to the call page where processing continues.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={submitting || !file}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
