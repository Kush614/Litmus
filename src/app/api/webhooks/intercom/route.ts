import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// POST /api/webhooks/intercom  -  Intercom webhook events
//
// Intercom sends webhook events for conversation updates, new messages,
// and other lifecycle events. We acknowledge quickly and capture structured
// metadata for observability.
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const topic = body.topic ?? "unknown";
    const appId = body.app_id ?? "unknown";

    const dataType = body.data?.item?.type ?? "unknown";
    const itemId = body.data?.item?.id ?? "unknown";

    // Intercom webhook verification — Intercom may send a ping with
    // topic "ping" to verify the webhook URL.
    if (topic === "ping") {
      return Response.json({ ok: true });
    }

    const handledTopics = new Set([
      "conversation.user.created",
      "conversation.admin.closed",
      "conversation.rating.added",
      "conversation.admin.assigned",
    ]);

    if (handledTopics.has(topic)) {
      console.log(
        `[webhooks/intercom] topic=${topic} app_id=${appId} item_type=${dataType} item_id=${itemId}`
      );
    } else {
      console.log(
        `[webhooks/intercom] topic=${topic} app_id=${appId} item_type=${dataType} item_id=${itemId} (unmapped)`
      );
    }

    // Acknowledge receipt
    return Response.json({ received: true, topic, item_id: itemId });
  } catch (error) {
    return handleApiError(error);
  }
}
