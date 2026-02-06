import { handleApiError } from "@/lib/utils/errors";
import { seedDiscoveryCandidates } from "@/lib/discovery/scraper";

// POST /api/discovery/seed — Seed discovery candidates from YC data
// Protected by CRON_SECRET for automated runs
export async function POST(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seedDiscoveryCandidates();

    return Response.json({
      message: "Seed complete",
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
