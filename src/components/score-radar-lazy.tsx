"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ScoreRadar = dynamic(
  () => import("@/components/score-radar").then((m) => ({ default: m.ScoreRadar })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[350px] w-full" />,
  }
);

type ScoreRadarLazyProps = {
  scores: Record<string, number>;
  comparisonScores?: Record<string, number>[];
  labels?: string[];
};

export function ScoreRadarLazy(props: ScoreRadarLazyProps) {
  return <ScoreRadar {...props} />;
}
