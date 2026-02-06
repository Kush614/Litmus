import { searchConversations } from "./client";

export type FinMetrics = {
  resolution_rate: number;
  avg_response_time_seconds: number;
  escalation_rate: number;
  topic_distribution: Record<string, number>;
  csat_average: number | undefined;
  total_conversations: number;
  time_range_days: number;
};

export type SampleConversation = {
  id: string;
  created_at: number;
  resolved: boolean;
  rating: number | undefined;
  tags: string[];
};

export async function fetchFinMetrics(timeRangeDays = 30): Promise<FinMetrics> {
  const sinceTimestamp = Math.floor(Date.now() / 1000) - 86400 * timeRangeDays;

  const result = await searchConversations({
    operator: "AND",
    value: [
      {
        field: "source.author.type",
        operator: "=",
        value: "bot",
      },
      {
        field: "statistics.last_close_at",
        operator: ">",
        value: sinceTimestamp,
      },
    ],
  });

  const conversations = result.conversations ?? [];
  const total = conversations.length;

  if (total === 0) {
    return {
      resolution_rate: 0,
      avg_response_time_seconds: 0,
      escalation_rate: 0,
      topic_distribution: {},
      csat_average: undefined,
      total_conversations: 0,
      time_range_days: timeRangeDays,
    };
  }

  let resolved = 0;
  let escalated = 0;
  let totalResponseTime = 0;
  let ratedCount = 0;
  let ratingSum = 0;
  const topics: Record<string, number> = {};

  for (const conv of conversations) {
    // Count resolutions (conversation closed without human handoff)
    if (conv.statistics?.last_close_at) {
      resolved++;
    }

    // Count escalations
    if (conv.teammates?.admins?.length > 0) {
      escalated++;
    }

    // Response time
    if (conv.statistics?.first_response_time) {
      totalResponseTime += conv.statistics.first_response_time;
    }

    // CSAT
    if (conv.conversation_rating?.rating) {
      ratedCount++;
      ratingSum += conv.conversation_rating.rating;
    }

    // Topics from tags
    if (conv.tags?.tags) {
      for (const tag of conv.tags.tags) {
        topics[tag.name] = (topics[tag.name] ?? 0) + 1;
      }
    }
  }

  return {
    resolution_rate: Math.round((resolved / total) * 100 * 100) / 100,
    avg_response_time_seconds: total > 0 ? Math.round(totalResponseTime / total) : 0,
    escalation_rate: Math.round((escalated / total) * 100 * 100) / 100,
    topic_distribution: topics,
    csat_average: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 100) / 100 : undefined,
    total_conversations: total,
    time_range_days: timeRangeDays,
  };
}

export async function fetchSampleConversations(limit = 10): Promise<SampleConversation[]> {
  const sinceTimestamp = Math.floor(Date.now() / 1000) - 86400 * 7;

  const result = await searchConversations({
    operator: "AND",
    value: [
      {
        field: "source.author.type",
        operator: "=",
        value: "bot",
      },
      {
        field: "created_at",
        operator: ">",
        value: sinceTimestamp,
      },
    ],
  });

  const conversations = result.conversations ?? [];

  return conversations.slice(0, limit).map((conv: Record<string, unknown>) => ({
    id: conv.id as string,
    created_at: conv.created_at as number,
    resolved: !!(conv as Record<string, Record<string, unknown>>).statistics?.last_close_at,
    rating: (conv as Record<string, Record<string, unknown>>).conversation_rating?.rating as
      | number
      | undefined,
    tags: ((conv as Record<string, Record<string, { name: string }[]>>).tags?.tags ?? []).map(
      (t) => t.name
    ),
  }));
}
