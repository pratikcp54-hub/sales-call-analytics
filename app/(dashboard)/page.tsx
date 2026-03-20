import Link from "next/link";
import { Suspense } from "react";
import { listCalls } from "@/lib/calls-server";
import { computeDashboardExtras, computeDashboardStats } from "@/lib/dashboard-stats";
import { teamHealthScore, topObjectionThisWeek } from "@/lib/team-analytics";
import { DashboardFilterTabs } from "@/components/dashboard-filter-tabs";
import { DashboardCallsTable } from "@/components/dashboard-calls-table";
import { SentimentChart } from "@/components/sentiment-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Upload, Phone, Inbox } from "lucide-react";
import { keywordEmoji } from "@/lib/keyword-emoji";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function filterCalls<T extends { status: string; overall_score: number | null; flagged_for_review: boolean }>(
  calls: T[],
  filter: string
): T[] {
  switch (filter) {
    case "needs_review":
      return calls.filter((c) => c.status === "completed" && c.overall_score != null && c.overall_score < 6);
    case "high":
      return calls.filter((c) => c.status === "completed" && c.overall_score != null && c.overall_score >= 8);
    case "flagged":
      return calls.filter((c) => c.flagged_for_review);
    default:
      return calls;
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const allCalls = await listCalls();
  const calls = filterCalls(allCalls, filter);
  const stats = computeDashboardStats(allCalls);
  const extras = computeDashboardExtras(allCalls);
  const health = teamHealthScore("week");
  const topObj = topObjectionThisWeek();
  const hasLlm =
    Boolean(process.env.GEMINI_API_KEY?.trim()) || Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasApiKeys = Boolean(process.env.ASSEMBLYAI_API_KEY?.trim()) && hasLlm;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of analyzed sales calls</p>
        </div>
        <Link href="/upload" className={cn(buttonVariants())}>
          <Upload className="mr-2 size-4" />
          Upload new call
        </Link>
      </div>

      {!hasApiKeys && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Configure environment</CardTitle>
            <CardDescription>
              Set <code className="text-xs">ASSEMBLYAI_API_KEY</code> plus either{" "}
              <code className="text-xs">GEMINI_API_KEY</code> (free tier: Google AI Studio) or{" "}
              <code className="text-xs">ANTHROPIC_API_KEY</code> in{" "}
              <code className="text-xs">.env.local</code> (see <code className="text-xs">.env.example</code>).
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {allCalls.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20">
          <Inbox className="size-14 text-muted-foreground/50" />
          <CardHeader className="text-center">
            <CardTitle>No calls yet</CardTitle>
            <CardDescription>Upload a recording to generate transcripts, scores, and insights.</CardDescription>
          </CardHeader>
          <Link href="/upload" className={cn(buttonVariants(), "mt-2")}>
            <Phone className="mr-2 size-4" />
            Upload first call
          </Link>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/25 bg-primary/5">
              <CardHeader className="pb-2">
                <CardDescription>Team health score</CardDescription>
                <div className="flex items-center gap-4">
                  <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary/30 bg-background">
                    <CardTitle className="text-3xl tabular-nums">{health.score.toFixed(1)}</CardTitle>
                    <span className="text-[10px] text-muted-foreground">/10</span>
                  </div>
                  <div className="text-sm">
                    {health.delta != null ? (
                      <span className={health.delta >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {health.delta >= 0 ? "↑" : "↓"} {Math.abs(health.delta)} vs last week
                      </span>
                    ) : (
                      <span className="text-muted-foreground">WoW trend</span>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Calls needing review</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{extras.needsReviewCount}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs">
                <Link href="/?filter=needs_review" className="text-primary hover:underline">
                  View filtered list
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top objection (7d)</CardDescription>
                <CardTitle className="text-lg capitalize">
                  {topObj ? `${topObj.type} · ${topObj.count}×` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Suspense fallback={<div className="mb-4 h-9" />}>
            <DashboardFilterTabs />
          </Suspense>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total calls</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{stats.totalCalls}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average score</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {stats.avgScore != null ? stats.avgScore.toFixed(1) : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader className="pb-0">
                <CardDescription>Sentiment split</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <SentimentChart
                  positive={stats.sentiment.positive}
                  neutral={stats.sentiment.neutral}
                  negative={stats.sentiment.negative}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg. duration</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {stats.avgDurationMinutes != null ? `${stats.avgDurationMinutes.toFixed(1)} min` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Action items</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{stats.actionItemsTotal}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg. conversion (AI est.)</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {stats.avgConversionRate != null ? `${(stats.avgConversionRate * 100).toFixed(0)}%` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg. question quality</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {stats.avgQuestionQuality != null ? stats.avgQuestionQuality.toFixed(1) : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Objections logged</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{stats.objectionsTracked}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Coaching tips generated</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{stats.coachingTipsTracked}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Top keywords</CardTitle>
              <CardDescription>Most frequent terms across completed calls</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topKeywords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keywords yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.topKeywords.map(({ word, count }) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 rounded-full border bg-secondary/40 px-2.5 py-1 text-xs"
                    >
                      <span>{keywordEmoji(word)}</span>
                      {word}
                      <span className="text-muted-foreground">×{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent calls</CardTitle>
              <CardDescription>
                {filter === "all"
                  ? "Latest uploads and analysis status"
                  : `Filtered: ${filter.replace(/_/g, " ")} (${calls.length} shown)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <DashboardCallsTable calls={calls} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
