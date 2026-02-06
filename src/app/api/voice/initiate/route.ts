import { z } from "zod/v4";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { initiateCall } from "@/lib/plivo/client";
import { handleApiError, validateWithZod, NotFoundError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const initiateCallSchema = z.object({
  agent_id: z.string().uuid(),
  phone_number: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +14155551234)"),
});

// ---------------------------------------------------------------------------
// POST /api/voice/initiate  -  Start a voice evaluation call
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const data = validateWithZod(initiateCallSchema, body);

    const supabase = createServiceRoleClient();

    // Verify the agent exists
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("id", data.agent_id)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) throw new NotFoundError("Agent");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`;

    // Initiate the Plivo outbound call
    const { requestUuid } = await initiateCall({
      to: data.phone_number,
      agentId: data.agent_id,
      answerUrl: `${appUrl}/api/voice/answer?agent_id=${data.agent_id}`,
      hangupUrl: `${appUrl}/api/webhooks/plivo`,
    });

    // Create a voice_evaluations record for tracking
    const { data: evaluation, error: insertError } = await supabase
      .from("voice_evaluations")
      .insert({
        agent_id: data.agent_id,
        call_uuid: requestUuid,
        evaluated_by: data.agent_id, // Placeholder until proper auth is implemented
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return Response.json(
      {
        evaluation_id: evaluation.id,
        call_uuid: requestUuid,
        status: "initiating",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
