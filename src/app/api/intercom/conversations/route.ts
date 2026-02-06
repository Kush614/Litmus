import { fetchSampleConversations } from "@/lib/intercom/metrics";
import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// GET /api/intercom/conversations  -  Fetch sample Intercom conversations
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return Response.json({ error: "limit must be between 1 and 50" }, { status: 400 });
    }

    const conversations = await fetchSampleConversations(limit);

    return Response.json({ conversations });
  } catch (error) {
    return handleApiError(error);
  }
}
