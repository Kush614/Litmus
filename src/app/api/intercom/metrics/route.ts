import { fetchFinMetrics } from "@/lib/intercom/metrics";
import { handleApiError } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// GET /api/intercom/metrics  -  Fetch Intercom Fin performance metrics
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const timeRangeDays = parseInt(url.searchParams.get("time_range_days") ?? "30", 10);

    if (isNaN(timeRangeDays) || timeRangeDays < 1 || timeRangeDays > 365) {
      return Response.json({ error: "time_range_days must be between 1 and 365" }, { status: 400 });
    }

    const metrics = await fetchFinMetrics(timeRangeDays);

    return Response.json({ metrics });
  } catch (error) {
    return handleApiError(error);
  }
}
