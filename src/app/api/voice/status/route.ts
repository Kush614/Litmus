import { createServiceRoleClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// POST /api/voice/status  -  Plivo stream status callback
//
// Plivo posts status events here when the audio stream starts, stops,
// or encounters errors. We use these to update the voice_evaluations record.
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    // Plivo sends status callbacks as form-encoded or JSON
    const contentType = request.headers.get("content-type") ?? "";
    let body: Record<string, string>;

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    }

    const callUuid = body.CallUUID ?? body.call_uuid;
    const streamId = body.StreamID ?? body.stream_id;
    const streamAction = body.StreamAction ?? body.stream_action ?? body.Event ?? "";

    if (!callUuid) {
      return Response.json({ error: "Missing CallUUID" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const updatePayload: Record<string, unknown> = {};

    if (streamId) {
      updatePayload.stream_id = streamId;
    }

    // Map Plivo stream events to our evaluation status
    switch (streamAction.toLowerCase()) {
      case "stream-started":
      case "started":
        // Stream has been established — no extra fields to set beyond stream_id
        break;

      case "stream-stopped":
      case "stopped":
        // Stream has ended; the duration may be included
        if (body.Duration || body.duration_seconds) {
          updatePayload.duration_seconds = parseInt(body.Duration ?? body.duration_seconds, 10);
        }
        break;

      case "stream-error":
      case "error":
        console.error("[voice/status] Stream error for call", callUuid, body);
        break;

      default:
        // Unknown event — log and acknowledge
        console.log("[voice/status] Unhandled stream event:", streamAction, body);
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("voice_evaluations").update(updatePayload).eq("call_uuid", callUuid);
    }

    return Response.json({ received: true });
  } catch (error) {
    return handleApiError(error);
  }
}
