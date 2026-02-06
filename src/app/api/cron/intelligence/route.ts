import { createServiceRoleClient } from "@/lib/supabase/server";
import { gatherIntelligence } from "@/lib/youcom/intelligence";
import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// GET /api/cron/intelligence  -  Scheduled intelligence refresh
//
// Called by Vercel Cron (or Render Cron) on a schedule (e.g., every 6 hours).
// Gathers fresh web intelligence for all active agents sequentially to
// avoid rate-limiting external APIs.
//
// Requires the CRON_SECRET header to match the server's CRON_SECRET env var.
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  try {
    // Validate CRON_SECRET to prevent unauthorized access
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[cron/intelligence] CRON_SECRET env var is not set");
      return Response.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Fetch all agents
    const { data: agents, error } = await supabase
      .from("agents")
      .select("id, name, vendor")
      .order("updated_at", { ascending: true });

    if (error) throw error;

    const results: { agent_id: string; name: string; status: string }[] = [];

    // Process agents sequentially to respect API rate limits
    for (const agent of agents ?? []) {
      try {
        await gatherIntelligence(agent.name, agent.vendor, agent.id);
        results.push({
          agent_id: agent.id,
          name: agent.name,
          status: "success",
        });
      } catch (e) {
        console.error(`[cron/intelligence] Failed for agent ${agent.name}:`, e);
        results.push({
          agent_id: agent.id,
          name: agent.name,
          status: `error: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    }

    return Response.json({
      processed: results.length,
      results,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
