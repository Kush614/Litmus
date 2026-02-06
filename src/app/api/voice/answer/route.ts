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
    const agentName = url.searchParams.get("agent_name") ?? undefined;

    const wsServerEnv = process.env.WS_SERVER_URL;
    if (!wsServerEnv) {
      throw new Error("WS_SERVER_URL environment variable is not set");
    }

    const parsedWsUrl = new URL(wsServerEnv);
    if (!["ws:", "wss:"].includes(parsedWsUrl.protocol)) {
      throw new Error("WS_SERVER_URL must use ws:// or wss://");
    }
    if (parsedWsUrl.pathname === "/" || parsedWsUrl.pathname === "") {
      parsedWsUrl.pathname = "/ws";
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

    const xml = buildStreamResponse({
      agentId,
      agentName,
      wsUrl: parsedWsUrl.toString(),
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
