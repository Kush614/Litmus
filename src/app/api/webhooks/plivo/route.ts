import { createServiceRoleClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// POST /api/webhooks/plivo  -  Plivo hangup / status webhooks
//
// Plivo sends webhook events when a call ends (hangup), status changes,
// or other lifecycle events occur. We update the corresponding
// voice_evaluations record accordingly.
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let body: Record<string, string>;

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    }

    const callUuid = body.CallUUID ?? body.call_uuid;
    const event = body.Event ?? body.HangupCause ?? body.CallStatus ?? "";

    if (!callUuid) {
      return Response.json({ error: "Missing CallUUID" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const updatePayload: Record<string, unknown> = {};

    // Process hangup events
    const hangupEvents = ["hangup", "completed", "busy", "no-answer", "cancel"];
    const callStatus = (body.CallStatus ?? "").toLowerCase();
    const hangupCause = (body.HangupCause ?? "").toLowerCase();

    if (
      hangupEvents.includes(callStatus) ||
      hangupEvents.includes(hangupCause) ||
      event.toLowerCase() === "hangup"
    ) {
      // Record duration if provided
      if (body.Duration || body.BillDuration) {
        updatePayload.duration_seconds = parseInt(body.Duration ?? body.BillDuration, 10);
      }
    }

    // Process status update events
    const statusMap: Record<string, string> = {
      ringing: "ringing",
      "in-progress": "connected",
      completed: "complete",
      busy: "failed",
      failed: "failed",
      "no-answer": "failed",
      cancel: "failed",
    };

    if (callStatus && statusMap[callStatus]) {
      // We don't store the status directly in voice_evaluations (the table
      // tracks evaluation data, not call state), but we log it for debugging.
      console.log(
        `[webhooks/plivo] Call ${callUuid} status: ${callStatus} -> ${statusMap[callStatus]}`
      );
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from("voice_evaluations")
        .update(updatePayload)
        .eq("call_uuid", callUuid);

      if (error) {
        console.error("[webhooks/plivo] Failed to update voice_evaluations:", error);
      }
    }

    // Always return 200 to acknowledge the webhook
    return Response.json({ received: true });
  } catch (error) {
    return handleApiError(error);
  }
}
