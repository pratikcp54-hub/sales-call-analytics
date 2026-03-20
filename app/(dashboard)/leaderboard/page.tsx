import {
  getLeaderboard,
  teamHealthScore,
  getGoldenCall,
  getTeamSentimentCounts,
  aggregateObjectionsForPeriod,
  getAgentRadarAverages,
  buildCompetitorAggregates,
  type PeriodFilter,
} from "@/lib/team-analytics";
import { LeaderboardClient } from "@/components/leaderboard-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const raw = sp.period;
  const period: PeriodFilter = raw === "month" || raw === "all" ? raw : "week";
  const rows = getLeaderboard(period);
  const health = teamHealthScore(period);
  const golden = getGoldenCall(period);
  const teamSentiment = getTeamSentimentCounts(period);
  const topObjections = aggregateObjectionsForPeriod(period).slice(0, 8);
  const podiumRadars = rows.slice(0, 3).map((r) => ({
    agentName: r.agentName,
    dims: getAgentRadarAverages(r.agentName),
  }));
  const topCompetitors = buildCompetitorAggregates().slice(0, 8);

  return (
    <LeaderboardClient
      period={period}
      rows={rows}
      health={health}
      golden={golden}
      teamSentiment={teamSentiment}
      topObjections={topObjections}
      podiumRadars={podiumRadars}
      topCompetitors={topCompetitors}
    />
  );
}
