"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { CallAudioPlayer } from "@/components/call-audio-player";
import { TalkTimeChart } from "@/components/talk-time-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { overallScoreClass, dimensionBarColor } from "@/lib/score-style";
import { keywordEmoji } from "@/lib/keyword-emoji";
import { CoachInsightsPanel } from "@/components/coach-insights-panel";
import { QuestionnaireTable } from "@/components/questionnaire-table";
import { AiCoachingCard } from "@/components/ai-coaching-card";
import { CustomerEmotionJourney } from "@/components/customer-emotion-journey";
import { FillerHabitBadges } from "@/components/filler-habit-badges";
import { ManagerReviewPanel } from "@/components/manager-review-panel";
import { formatCallDateTime } from "@/lib/format-datetime";
import type { CallRow, PerformanceScoresRow, QuestionnaireRow } from "@/lib/types";
import { ArrowRight, ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Payload = {
  call: CallRow;
  performance_scores: PerformanceScoresRow | null;
  questionnaire_coverage: QuestionnaireRow[];
};

type ScoreKey =
  | "communication_clarity"
  | "politeness"
  | "business_knowledge"
  | "problem_handling"
  | "listening_ability";

const DIMS: { key: ScoreKey; label: string; hint: string }[] = [
  { key: "communication_clarity", label: "Communication Clarity", hint: "Clear, concise, easy to understand?" },
  { key: "politeness", label: "Politeness", hint: "Respectful, empathetic, professional tone?" },
  { key: "business_knowledge", label: "Business Knowledge", hint: "Strong product and industry knowledge?" },
  { key: "problem_handling", label: "Problem Handling", hint: "Objections handled calmly and constructively?" },
  { key: "listening_ability", label: "Listening Ability", hint: "Adequate space for the customer to speak?" },
];

export function CallDetailClient({ callId, initial }: { callId: string; initial: Payload | null }) {
  const [data, setData] = useState<Payload | null>(initial);
  const audioUrl = `/api/calls/${callId}/audio`;
  const [step, setStep] = useState<"idle" | "transcribing" | "analyzing" | "done">(() =>
    initial?.call.status === "processing" ? "transcribing" : "idle"
  );
  const processStarted = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/calls/${callId}`);
    if (!res.ok) return;
    const json = (await res.json()) as Payload;
    setData(json);
    return json;
  }, [callId]);

  // Trigger server pipeline once when status is processing; avoid re-running on unrelated call field updates.
  useEffect(() => {
    const status = data?.call?.status;
    if (!data?.call || status !== "processing" || processStarted.current) return;
    processStarted.current = true;
    setStep("transcribing");
    void (async () => {
      try {
        const res = await fetch("/api/process-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error ?? "Processing failed");
          setStep("done");
          processStarted.current = false;
          await refresh();
          return;
        }
        setStep("analyzing");
        await refresh();
        setStep("done");
        processStarted.current = false;
      } catch {
        toast.error("Network error during processing");
        setStep("done");
        processStarted.current = false;
        await refresh();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when status or callId changes
  }, [data?.call?.status, callId, refresh]);

  useEffect(() => {
    if (!data?.call || data.call.status !== "processing") return;
    const t = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll interval keyed on status only
  }, [data?.call?.status, refresh]);

  const [reAnalyzing, setReAnalyzing] = useState(false);

  const retry = async () => {
    processStarted.current = true;
    setReAnalyzing(true);
    setStep("transcribing");
    const res = await fetch(`/api/calls/${callId}/retry`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Retry failed");
      setStep("done");
      processStarted.current = false;
      setReAnalyzing(false);
      return;
    }
    toast.success("Analysis complete");
    setStep("done");
    processStarted.current = false;
    setReAnalyzing(false);
    await refresh();
  };

  if (!data?.call) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const c = data.call;
  const processing = c.status === "processing";
  const failed = c.status === "failed";
  const complete = c.status === "completed";

  const estWpm =
    complete && c.transcript && c.duration_seconds && c.duration_seconds > 0
      ? Math.round(
          c.transcript
            .trim()
            .split(/\s+/)
            .filter(Boolean).length /
            (c.duration_seconds / 60)
        )
      : null;

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{c.file_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCallDateTime(c.created_at)}
            {c.duration_seconds != null && ` · ${Math.round(c.duration_seconds / 60)} min ${c.duration_seconds % 60}s`}
            {estWpm != null && ` · ~${estWpm} WPM`}
            {c.agent_name && ` · Agent: ${c.agent_name}`}
          </p>
          {complete && (
            <FillerHabitBadges
              insights={c.extended_insights}
              transcript={c.transcript}
              durationSeconds={c.duration_seconds}
              segments={c.transcript_segments}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {processing && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              <Loader2 className="size-4 animate-spin" />
              Processing…
            </div>
          )}
          {(failed || complete) && (
            <Button
              variant="outline"
              disabled={reAnalyzing || processing}
              onClick={() => void retry()}
            >
              <RefreshCw className={`mr-2 size-4 ${reAnalyzing ? "animate-spin" : ""}`} />
              {failed ? "Retry analysis" : "Re-run analysis"}
            </Button>
          )}
          {complete && c.overall_score != null && (
            <div
              className={`rounded-xl border px-4 py-2 text-center ${overallScoreClass(c.overall_score)}`}
            >
              <p className="text-xs font-medium uppercase opacity-80">Overall score</p>
              <p className="text-3xl font-bold tabular-nums">{c.overall_score.toFixed(1)}</p>
              <p className="text-xs opacity-80">out of 10</p>
            </div>
          )}
          {c.sentiment && (
            <Badge
              variant="secondary"
              className={
                c.sentiment === "positive"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : c.sentiment === "negative"
                    ? "bg-red-500/15 text-red-800 dark:text-red-300"
                    : ""
              }
            >
              {c.sentiment}
            </Badge>
          )}
        </div>
      </div>

      {processing && (
        <ProcessingStepper step={step} />
      )}

      {complete && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Call summary</CardTitle>
                <CardDescription>AI-generated overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm leading-relaxed text-muted-foreground">{c.call_summary}</p>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Recording</h3>
                  <CallAudioPlayer audioUrl={audioUrl} segments={c.transcript_segments} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Talk time analysis</CardTitle>
                <CardDescription>Speaker A = agent, others = customer</CardDescription>
              </CardHeader>
              <CardContent>
                {c.agent_talk_percent != null && c.customer_talk_percent != null ? (
                  <>
                    <TalkTimeChart agent={c.agent_talk_percent} customer={c.customer_talk_percent} />
                    <p className="text-center text-sm text-muted-foreground">
                      Agent {c.agent_talk_percent}% · Customer {c.customer_talk_percent}%
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No diarization data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {data.performance_scores && (
            <Card>
              <CardHeader>
                <CardTitle>Agent performance scoring</CardTitle>
                <CardDescription>1–10 per dimension</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {DIMS.map(({ key, label, hint }) => {
                  const v = data.performance_scores![key];
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{hint}</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{v}/10</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${dimensionBarColor(v)}`}
                          style={{ width: `${v * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {complete && (
            <>
              <AiCoachingCard insights={c.extended_insights} />
              {c.extended_insights ? (
                <CustomerEmotionJourney
                  points={c.extended_insights.emotion_timeline ?? []}
                  segments={c.transcript_segments}
                  startSentiment={c.extended_insights.customer_sentiment_start}
                  endSentiment={c.extended_insights.customer_sentiment_end}
                  objections={c.extended_insights.objections ?? []}
                  competitors={c.extended_insights.competitor_mentions ?? []}
                />
              ) : null}
            </>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Business questionnaire coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionnaireTable rows={data.questionnaire_coverage} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top keywords discussed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(c.keywords ?? []).slice(0, 8).map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/50 px-3 py-1 text-sm"
                    >
                      <span>{keywordEmoji(k)}</span>
                      {k}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Follow-up action items</CardTitle>
                <CardDescription>Commitments and next steps from the call</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(c.action_items ?? []).map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-emerald-800 dark:text-emerald-300">Positive observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {(c.positive_observations ?? []).map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader>
                  <CardTitle className="text-red-800 dark:text-red-300">Negative observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {(c.negative_observations ?? []).map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <CoachInsightsPanel insights={c.extended_insights} />

          <ManagerReviewPanel
            key={`${c.id}-${c.reviewed_at ?? ""}`}
            callId={callId}
            initial={c}
            onSaved={() => {
              void refresh();
            }}
          />
        </>
      )}

      {failed && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Analysis failed</CardTitle>
            <CardDescription>Transcription or AI step encountered an error. Try again.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function ProcessingStepper({ step }: { step: "transcribing" | "analyzing" | "done" | "idle" }) {
  const p = step === "transcribing" ? 1 : step === "analyzing" ? 2 : step === "done" ? 3 : 0;
  const items = [
    { label: "Uploading", n: 1, done: true, current: false },
    { label: "Transcribing", n: 2, done: p >= 2, current: p === 1 },
    { label: "Analyzing", n: 3, done: p >= 3, current: p === 2 },
    { label: "Complete", n: 4, done: p >= 3 && step === "done", current: p === 3 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline</CardTitle>
        <CardDescription>Upload finished — server is transcribing and analyzing this call</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-wrap gap-6">
          {items.map((s) => (
            <li
              key={s.label}
              className={`flex items-center gap-2 text-sm ${s.done || s.current ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full border text-xs font-medium ${
                  s.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : s.current
                      ? "border-primary bg-primary/10"
                      : "border-muted"
                }`}
              >
                {s.done ? "✓" : s.n}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
