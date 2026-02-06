import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/utils/constants";
import { formatScore } from "@/lib/utils/scoring";
import type { AgentCategory } from "@/types/agent";

type AgentCardProps = {
  slug: string;
  name: string;
  vendor: string;
  category: string;
  overall_score: number | null;
  total_evaluations: number | null;
  capabilities: string[] | null;
};

export function AgentCard({
  slug,
  name,
  vendor,
  category,
  overall_score,
  total_evaluations,
  capabilities,
}: AgentCardProps) {
  const scoreColor =
    overall_score === null
      ? "text-muted-foreground"
      : overall_score >= 80
        ? "text-green-600"
        : overall_score >= 60
          ? "text-yellow-600"
          : "text-red-600";

  return (
    <Link href={`/agents/${slug}`}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <p className="text-sm text-muted-foreground">{vendor}</p>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
              {formatScore(overall_score ?? undefined)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">
              {CATEGORY_LABELS[category as AgentCategory] ?? category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {total_evaluations ?? 0} evaluations
            </span>
          </div>
          {capabilities && capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {capabilities.slice(0, 4).map((cap) => (
                <Badge key={cap} variant="outline" className="text-xs">
                  {cap}
                </Badge>
              ))}
              {capabilities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{capabilities.length - 4}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
