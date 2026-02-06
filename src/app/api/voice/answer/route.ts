import { buildStreamResponse } from "@/lib/plivo/xml";
import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// POST /api/voice/answer  -  Plivo answer URL callback
//
// Plivo calls this URL when the outbound call is answered. We return XML
// that plays an intro message and then establishes a bidirectional
// WebSocket audio stream to the dedicated WS server.
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agent_id") ?? "unknown";

    const wsServerUrl = process.env.WS_SERVER_URL ?? `wss://${process.env.VERCEL_URL}/api/voice/ws`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`;

    const xml = buildStreamResponse({
      agentId,
      wsUrl: wsServerUrl,
      statusCallbackUrl: `${appUrl}/api/voice/status`,
    });

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
