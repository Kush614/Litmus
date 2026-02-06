import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

type IntelligenceEntry = {
  id: string;
  source_type: string;
  source_url: string;
  title: string;
  summary: string;
  sentiment: string | null;
  relevance_score: number | null;
  fetched_at: string | null;
};

type IntelligenceFeedProps = {
  entries: IntelligenceEntry[];
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  changelog: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  news: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  outage: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  pricing_change: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: "+",
  neutral: "~",
  negative: "-",
};

export function IntelligenceFeed({ entries }: IntelligenceFeedProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No intelligence data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Web Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="border-b pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_TYPE_COLORS[entry.source_type] ?? "bg-gray-100 text-gray-800"}`}
              >
                {entry.source_type.replace("_", " ")}
              </span>
              {entry.sentiment && (
                <Badge variant="outline" className="text-xs">
                  {SENTIMENT_EMOJI[entry.sentiment] ?? ""} {entry.sentiment}
                </Badge>
              )}
              {entry.fetched_at && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(entry.fetched_at), { addSuffix: true })}
                </span>
              )}
            </div>
            <a
              href={entry.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {entry.title}
            </a>
            <p className="text-sm text-muted-foreground mt-1">{entry.summary}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
