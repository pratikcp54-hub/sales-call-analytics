import { notFound } from "next/navigation";
import {
  getWeeklyAvgScores,
  getAgentRadarAverages,
  getTeamRadarAverages,
  getDimensionScoresLastNCalls,
  getTalkPercentByCall,
  aggregateFillerForAgent,
  getMonologueCountsLastNCalls,
} from "@/lib/team-analytics";
import { listCallsForAgent } from "@/lib/db";
import { AgentProfileClient } from "@/components/agent-profile-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  return { title: `${name} · Agent profile` };
}

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agentName = decodeURIComponent(slug);
  const calls = listCallsForAgent(agentName);
  if (!calls.length) notFound();

  const completed = calls.filter((c) => c.status === "completed");
  const totalAnalyzed = completed.length;
  const scores = completed.map((c) => c.overall_score).filter((s): s is number => s != null);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const weeklyTrend = getWeeklyAvgScores(agentName, 8);
  const radarAgent = getAgentRadarAverages(agentName);
  const radarTeam = getTeamRadarAverages();
  const dimOverTime = getDimensionScoresLastNCalls(agentName, 12);
  const talkByCall = getTalkPercentByCall(agentName);
  const fillerTotals = aggregateFillerForAgent(agentName);
  const monologuePerCall = getMonologueCountsLastNCalls(agentName, 12);

  return (
    <AgentProfileClient
      agentName={agentName}
      totalAnalyzed={totalAnalyzed}
      avgScore={avgScore}
      weeklyTrend={weeklyTrend}
      radarAgent={radarAgent}
      radarTeam={radarTeam}
      dimOverTime={dimOverTime}
      talkByCall={talkByCall}
      fillerTotals={fillerTotals}
      monologuePerCall={monologuePerCall}
      recentCalls={calls}
    />
  );
}
