"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

type ScoreRadarProps = {
  scores: Record<string, number>;
  comparisonScores?: Record<string, number>[];
  labels?: string[];
};

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04"];

export function ScoreRadar({ scores, comparisonScores, labels }: ScoreRadarProps) {
  const dimensions = Object.keys(scores);

  const data = dimensions.map((dim) => {
    const entry: Record<string, string | number> = {
      dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
      primary: scores[dim] ?? 0,
    };

    if (comparisonScores) {
      comparisonScores.forEach((cs, i) => {
        entry[`comparison_${i}`] = cs[dim] ?? 0;
      });
    }

    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dimension" className="text-xs" />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        <Radar
          name={labels?.[0] ?? "Score"}
          dataKey="primary"
          stroke={COLORS[0]}
          fill={COLORS[0]}
          fillOpacity={0.2}
        />
        {comparisonScores?.map((_, i) => (
          <Radar
            key={i}
            name={labels?.[i + 1] ?? `Agent ${i + 2}`}
            dataKey={`comparison_${i}`}
            stroke={COLORS[(i + 1) % COLORS.length]}
            fill={COLORS[(i + 1) % COLORS.length]}
            fillOpacity={0.1}
          />
        ))}
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
