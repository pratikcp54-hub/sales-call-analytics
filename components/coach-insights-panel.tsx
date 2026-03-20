import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoachObjectionsTable } from "@/components/coach-objections-table";
import type { ExtendedCoachInsights } from "@/lib/types";
import { Lightbulb, Target, TrendingUp, Users } from "lucide-react";

function sentimentBadge(s: string) {
  const cls =
    s === "positive"
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
      : s === "negative"
        ? "bg-red-500/15 text-red-800 dark:text-red-300"
        : "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  return (
    <Badge variant="secondary" className={cls}>
      {s}
    </Badge>
  );
}

export function CoachInsightsPanel({ insights }: { insights: ExtendedCoachInsights | null }) {
  if (!insights) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Coaching insights</CardTitle>
          <CardDescription>
            Re-run analysis on this call to generate enriched coaching data, or this call was completed before
            extended insights were added.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const fillerEntries = Object.entries(insights.filler_word_count ?? {}).filter(([, n]) => n > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="size-3.5" /> Conversion probability
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {(insights.conversion_probability * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Target className="size-3.5" /> Question quality
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{insights.question_quality_score}/10</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Customer sentiment</CardDescription>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-normal">
              {sentimentBadge(insights.customer_sentiment_start)}
              <span className="text-muted-foreground">→</span>
              {sentimentBadge(insights.customer_sentiment_end)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Lightbulb className="size-3.5" /> Next best action
            </CardDescription>
            <CardTitle className="text-sm font-normal leading-snug text-foreground">
              {insights.next_best_action || "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {insights.question_quality_notes ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Question quality notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{insights.question_quality_notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" /> Objections
            </CardTitle>
            <CardDescription>How the customer pushed back and how the agent responded</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {!insights.objections?.length ? (
              <p className="px-6 text-sm text-muted-foreground">No objections detected</p>
            ) : (
              <CoachObjectionsTable rows={insights.objections} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitor mentions</CardTitle>
            <CardDescription>Named alternatives and agent response</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {!insights.competitor_mentions?.length ? (
              <p className="px-6 text-sm text-muted-foreground">No competitors mentioned</p>
            ) : (
              <ul className="space-y-4 px-6">
                {insights.competitor_mentions.map((c, i) => (
                  <li key={i} className="border-b border-border/60 pb-3 last:border-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{c.context}</p>
                    <p className="mt-1 text-sm">{c.agent_response}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filler words (agent)</CardTitle>
          <CardDescription>Counts from transcript analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {fillerEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No filler counts or all zero</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fillerEntries.map(([word, count]) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                >
                  <span className="font-medium">{word.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">×{count}</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
