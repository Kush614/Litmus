"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatScore } from "@/lib/utils/scoring";
import type {
  MatchedCandidate,
  CustomScenario,
  ScenarioEvalResult,
  FinalRecommendation,
} from "@/types/discovery";

const ScoreRadar = dynamic(
  () => import("@/components/score-radar").then((m) => ({ default: m.ScoreRadar })),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full" /> }
);

type DiscoveryResultsProps = {
  useCaseSummary: string;
  matchedCandidates: MatchedCandidate[];
  scenarios: CustomScenario[];
  evaluationResults: ScenarioEvalResult[];
  recommendation: FinalRecommendation;
};

export function DiscoveryResults({
  useCaseSummary,
  matchedCandidates,
  scenarios,
  evaluationResults,
  recommendation,
}: DiscoveryResultsProps) {
  // Compute average scores per candidate for radar chart
  const candidateAvgScores: Record<string, Record<string, number>> = {};
  for (const result of evaluationResults) {
    if (!candidateAvgScores[result.candidate_id]) {
      candidateAvgScores[result.candidate_id] = {};
    }
    for (const [dim, score] of Object.entries(result.scores)) {
      if (!candidateAvgScores[result.candidate_id][dim]) {
        candidateAvgScores[result.candidate_id][dim] = 0;
      }
      candidateAvgScores[result.candidate_id][dim] += score / scenarios.length;
    }
  }

  const ranked = recommendation.ranked_agents;
  const topPick = ranked[0];

  return (
    <div className="space-y-6">
      {/* Use Case Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Use Case</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{useCaseSummary}</p>
        </CardContent>
      </Card>

      {/* Top Recommendation */}
      {topPick && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="text-lg px-3 py-1">Top Pick</Badge>
              <CardTitle className="text-xl">{topPick.name}</CardTitle>
              <Badge variant="secondary" className="ml-auto text-lg">
                {formatScore(topPick.overall_score)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{recommendation.top_pick_justification}</p>
            <div className="flex flex-wrap gap-2">
              {topPick.strengths.map((s) => (
                <Badge key={s} variant="outline" className="text-green-600 border-green-600">
                  {s}
                </Badge>
              ))}
            </div>
            {topPick.best_for && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Best for:</span> {topPick.best_for}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Radar Chart Comparison */}
      {ranked.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Score Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(candidateAvgScores).length > 0 && ranked.length > 0 && (
              <ScoreRadar
                scores={candidateAvgScores[ranked[0].candidate_id] ?? {}}
                comparisonScores={ranked
                  .slice(1, 4)
                  .map((r) => candidateAvgScores[r.candidate_id] ?? {})}
                labels={ranked.slice(0, 4).map((r) => r.name)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* All Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ranked.map((agent) => {
              const candidate = matchedCandidates.find(
                (c) => c.candidate_id === agent.candidate_id || c.name === agent.name
              );
              return (
                <div
                  key={agent.candidate_id || agent.name}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                    #{agent.rank}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{agent.name}</p>
                      <Badge variant="secondary">{formatScore(agent.overall_score)}</Badge>
                    </div>
                    {candidate?.description && (
                      <p className="text-xs text-muted-foreground">{candidate.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {agent.strengths.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] text-green-600">
                          {s}
                        </Badge>
                      ))}
                      {agent.weaknesses.map((w) => (
                        <Badge key={w} variant="outline" className="text-[10px] text-red-500">
                          {w}
                        </Badge>
                      ))}
                    </div>
                    {agent.best_for && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Best for:</span> {agent.best_for}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Evaluation Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            These scenarios were generated specifically for your use case to test how well each
            candidate would perform.
          </p>
          {scenarios.map((scenario, i) => (
            <div key={scenario.id || i} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Scenario {i + 1}
                </Badge>
                <p className="font-medium text-sm">{scenario.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{scenario.description}</p>
              <div className="flex flex-wrap gap-1">
                {scenario.expected_capabilities.map((cap) => (
                  <Badge key={cap} variant="outline" className="text-[10px]">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Detailed Score Table */}
      {evaluationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Metric</th>
                    {ranked.map((a) => (
                      <th key={a.candidate_id || a.name} className="text-right py-2 px-2">
                        {a.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    "relevance",
                    "capability_fit",
                    "ease_of_integration",
                    "value_for_money",
                    "scalability",
                  ].map((dim) => {
                    const values = ranked.map(
                      (a) => candidateAvgScores[a.candidate_id]?.[dim] ?? 0
                    );
                    const maxVal = Math.max(...values);
                    return (
                      <tr key={dim} className="border-b">
                        <td className="py-2 pr-4 capitalize">{dim.replace(/_/g, " ")}</td>
                        {ranked.map((a, i) => (
                          <td
                            key={a.candidate_id || a.name}
                            className={`text-right py-2 px-2 ${values[i] === maxVal ? "font-semibold text-green-600" : ""}`}
                          >
                            {formatScore(values[i])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
