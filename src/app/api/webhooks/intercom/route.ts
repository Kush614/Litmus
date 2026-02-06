import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// POST /api/webhooks/intercom  -  Intercom webhook events
//
// Intercom sends webhook events for conversation updates, new messages,
// and other lifecycle events. This is a placeholder that acknowledges
// receipt and logs the event for future implementation.
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const topic = body.topic ?? "unknown";
    const appId = body.app_id ?? "unknown";

    console.log(`[webhooks/intercom] Received event: topic=${topic}, app_id=${appId}`);

    // Intercom webhook verification — Intercom may send a ping with
    // topic "ping" to verify the webhook URL.
    if (topic === "ping") {
      return Response.json({ ok: true });
    }

    // Future implementation: process conversation events for real-time
    // metric updates, e.g.:
    //   - "conversation.user.created"   -> new conversation started
    //   - "conversation.admin.closed"   -> conversation resolved
    //   - "conversation.rating.added"   -> CSAT rating submitted
    //   - "conversation.admin.assigned" -> escalation detected

    // Acknowledge receipt
    return Response.json({ received: true, topic });
  } catch (error) {
    return handleApiError(error);
  }
}
