import { z } from "zod/v4";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { initiateCall } from "@/lib/plivo/client";
import {
  handleApiError,
  validateWithZod,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +14155551234)");

const agentCallSchema = z.object({
  agent_id: z.string().uuid(),
  phone_number: phoneNumberSchema,
});

const discoveryCallSchema = z.object({
  agent_id: z.literal("discovery"),
  phone_number: phoneNumberSchema,
  discovery_session_id: z.string().uuid(),
});

const initiateCallSchema = z.union([discoveryCallSchema, agentCallSchema]);

function getBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  if (!authorization) return undefined;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return undefined;
  if (!token || token.trim().length === 0) return undefined;
  return token.trim();
}

// ---------------------------------------------------------------------------
// POST /api/voice/initiate  -  Start a voice evaluation call
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const data = validateWithZod(initiateCallSchema, body);
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      throw new UnauthorizedError("Sign in is required to start a voice evaluation");
    }

    const supabase = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedError("Invalid or expired session");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const isDiscovery = data.agent_id === "discovery";

    if (isDiscovery) {
      // Discovery call — no specific agent, conversation drives tool research
      const discoveryData = data as z.infer<typeof discoveryCallSchema>;

      const { requestUuid } = await initiateCall({
        to: data.phone_number,
        agentId: "discovery",
        answerUrl: `${appUrl}/api/voice/answer?agent_id=discovery&discovery_session_id=${discoveryData.discovery_session_id}`,
        hangupUrl: `${appUrl}/api/webhooks/plivo`,
      });

      return Response.json(
        {
          call_uuid: requestUuid,
          discovery_session_id: discoveryData.discovery_session_id,
          status: "initiating",
        },
        { status: 201 }
      );
    }

    // Agent evaluation call — existing flow
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("id", data.agent_id)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) throw new NotFoundError("Agent");

    const { requestUuid } = await initiateCall({
      to: data.phone_number,
      agentId: data.agent_id,
      answerUrl: `${appUrl}/api/voice/answer?agent_id=${data.agent_id}&agent_name=${encodeURIComponent(agent.name)}`,
      hangupUrl: `${appUrl}/api/webhooks/plivo`,
    });

    // Create a voice_evaluations record for tracking
    const { data: evaluation, error: insertError } = await supabase
      .from("voice_evaluations")
      .insert({
        agent_id: data.agent_id,
        call_uuid: requestUuid,
        evaluated_by: user.id,
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
