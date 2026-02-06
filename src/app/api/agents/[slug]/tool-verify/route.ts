import { z } from "zod/v4";
import { createServerClient } from "@/lib/supabase/server";
import { verifyToolClaim } from "@/lib/composio/verifier";
import { handleApiError, validateWithZod, NotFoundError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const toolVerifySchema = z.object({
  toolkit_name: z.string().min(1).max(100),
});

// ---------------------------------------------------------------------------
// POST /api/agents/[slug]/tool-verify  -  Verify a tool claim via Composio
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await params;
    const body = await request.json();
    const data = validateWithZod(toolVerifySchema, body);

    const supabase = createServerClient();

    // Fetch agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) throw new NotFoundError("Agent");

    const result = await verifyToolClaim(agent.id, data.toolkit_name);

    return Response.json({
      agent_slug: slug,
      toolkit_name: data.toolkit_name,
      verification: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
