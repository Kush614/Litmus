import { createServerClient } from "@/lib/supabase/server";
import { gatherIntelligence, getLatestIntelligence } from "@/lib/youcom/intelligence";
import { handleApiError, NotFoundError } from "@/lib/utils/errors";
import { INTELLIGENCE_CACHE_TTL_MS } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// GET /api/agents/[slug]/intelligence  -  Cached web intelligence
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await params;
    const supabase = createServerClient();

    // Fetch the agent to get the ID, name, and vendor
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, vendor, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) throw new NotFoundError("Agent");

    // Get cached intelligence
    const intelligence = await getLatestIntelligence(agent.id);

    // Determine staleness — if the latest entry is older than the TTL,
    // kick off a background refresh.
    let lastUpdated: string | undefined;
    if (intelligence.length > 0) {
      lastUpdated = intelligence[0].fetched_at ?? undefined;
    }

    const isStale =
      !lastUpdated || Date.now() - new Date(lastUpdated).getTime() > INTELLIGENCE_CACHE_TTL_MS;

    if (isStale) {
      // Fire-and-forget background refresh
      (async () => {
        try {
          await gatherIntelligence(agent.name, agent.vendor, agent.id);
        } catch (e) {
          console.error("[intelligence] Background refresh failed:", e);
        }
      })();
    }

    return Response.json({
      agent_slug: agent.slug,
      intelligence,
      last_updated: lastUpdated ?? null,
      is_refreshing: isStale,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
