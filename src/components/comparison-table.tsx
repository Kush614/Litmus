"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatScore } from "@/lib/utils/scoring";
import { MAX_COMPARE_AGENTS } from "@/lib/utils/constants";
import type { AgentProfile } from "@/types/agent";

const ScoreRadar = dynamic(
  () => import("@/components/score-radar").then((m) => ({ default: m.ScoreRadar })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[350px]" />,
  }
);

type ComparisonTableProps = {
  availableAgents: { slug: string; name: string }[];
};

type AgentData = AgentProfile & {
  avgScores: Record<string, number>;
};

export function ComparisonTable({ availableAgents }: ComparisonTableProps) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string>("");
  const [useCase, setUseCase] = useState("");

  async function addAgent(slug: string) {
    if (selectedSlugs.includes(slug) || selectedSlugs.length >= MAX_COMPARE_AGENTS) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${slug}`);
      if (!res.ok) return;
      const data = await res.json();

      const avgScores: Record<string, number> = {};
      if (data.benchmarks?.length > 0) {
        const allScores = data.benchmarks.map((b: { scores: Record<string, number> }) => b.scores);
        const keys = Object.keys(allScores[0] ?? {});
        for (const key of keys) {
          avgScores[key] =
            allScores.reduce((sum: number, s: Record<string, number>) => sum + (s[key] ?? 0), 0) /
            allScores.length;
        }
      }

      setSelectedSlugs((prev) => [...prev, slug]);
      setAgents((prev) => [...prev, { ...data.agent, avgScores }]);
    } finally {
      setLoading(false);
    }
  }

  function removeAgent(slug: string) {
    setSelectedSlugs((prev) => prev.filter((s) => s !== slug));
    setAgents((prev) => prev.filter((a) => a.slug !== slug));
  }

  async function getRecommendation() {
    if (agents.length < 2 || !useCase) return;

    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "comparison",
        agents: agents.map((a) => ({
          name: a.name,
          description: a.description ?? "",
          scores: a.avgScores,
        })),
        use_case: useCase,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setRecommendation(data.recommendation ?? "");
    }
  }

  const dimensions = agents.length > 0 ? Object.keys(agents[0].avgScores) : [];

  return (
    <div className="space-y-6">
      {/* Agent Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Agents to Compare (max {MAX_COMPARE_AGENTS})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {agents.map((a) => (
              <Badge key={a.slug} variant="default" className="gap-1">
                {a.name}
                <button onClick={() => removeAgent(a.slug)} className="ml-1 hover:text-red-400">
                  x
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableAgents
              .filter((a) => !selectedSlugs.includes(a.slug))
              .map((a) => (
                <Button
                  key={a.slug}
                  variant="outline"
                  size="sm"
                  onClick={() => addAgent(a.slug)}
                  disabled={loading || selectedSlugs.length >= MAX_COMPARE_AGENTS}
                >
                  + {a.name}
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      {agents.length >= 2 && dimensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Score Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRadar
              scores={agents[0].avgScores}
              comparisonScores={agents.slice(1).map((a) => a.avgScores)}
              labels={agents.map((a) => a.name)}
            />
          </CardContent>
        </Card>
      )}

      {/* Metric Table */}
      {agents.length >= 2 && dimensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Metric</th>
                    {agents.map((a) => (
                      <th key={a.slug} className="text-right py-2 px-2">
                        {a.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b font-medium">
                    <td className="py-2 pr-4">Overall Score</td>
                    {agents.map((a) => (
                      <td key={a.slug} className="text-right py-2 px-2">
                        {formatScore(a.overall_score ?? undefined)}
                      </td>
                    ))}
                  </tr>
                  {dimensions.map((dim) => {
                    const maxVal = Math.max(...agents.map((a) => a.avgScores[dim] ?? 0));
                    return (
                      <tr key={dim} className="border-b">
                        <td className="py-2 pr-4 capitalize">{dim}</td>
                        {agents.map((a) => {
                          const val = a.avgScores[dim] ?? 0;
                          return (
                            <td
                              key={a.slug}
                              className={`text-right py-2 px-2 ${val === maxVal ? "font-semibold text-green-600" : ""}`}
                            >
                              {formatScore(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-b">
                    <td className="py-2 pr-4">Total Evaluations</td>
                    {agents.map((a) => (
                      <td key={a.slug} className="text-right py-2 px-2">
                        {a.total_evaluations ?? 0}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendation */}
      {agents.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Describe your use case..."
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
              />
              <Button onClick={getRecommendation} disabled={!useCase}>
                Get Recommendation
              </Button>
            </div>
            {recommendation && (
              <p className="text-sm leading-relaxed bg-muted p-4 rounded-lg">{recommendation}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
