import { z } from "zod/v4";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  handleApiError,
  validateWithZod,
  UnauthorizedError,
  NotFoundError,
} from "@/lib/utils/errors";
import { streamDiscoveryChat, extractRequirements } from "@/lib/gemini/discovery";
import { matchCandidates } from "@/lib/discovery/matcher";
import { discoverFromWeb } from "@/lib/discovery/scraper";
import type { ConversationMessage, MatchedCandidate } from "@/types/discovery";
import type { Json } from "@/lib/supabase/types";

const chatSchema = z.object({
  message: z.string().min(1),
});

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/discovery/sessions/[id]/chat — Send a message and get streaming response
export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const data = validateWithZod(chatSchema, body);

    const serviceClient = createServiceRoleClient();
    const { data: session, error } = await serviceClient
      .from("discovery_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !session) throw new NotFoundError("Discovery session");

    // Add user message to history
    const history = (session.conversation_history ?? []) as unknown as ConversationMessage[];
    history.push({
      role: "user",
      content: data.message,
      timestamp: Date.now(),
    });

    // Stream Gemini response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamDiscoveryChat(history);

          for await (const chunk of generator) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
            );
          }

          // Add assistant response to history
          history.push({
            role: "assistant",
            content: fullResponse,
            timestamp: Date.now(),
          });

          // Check if Gemini signaled ready to search
          const readyToSearch = fullResponse.includes("[READY_TO_SEARCH]");

          // Save updated conversation
          const updatePayload: Record<string, unknown> = {
            conversation_history: history as unknown as Json,
            updated_at: new Date().toISOString(),
          };

          // If ready to search, extract requirements and match candidates
          if (readyToSearch) {
            updatePayload.status = "researching";

            // Extract requirements
            const requirements = await extractRequirements(history);
            const useCaseSummary = requirements.pain_points.join(". ") || data.message;
            updatePayload.use_case_summary = useCaseSummary;
            updatePayload.extracted_requirements = requirements as unknown as Json;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", content: "Searching for matching AI tools..." })}\n\n`
              )
            );

            // Match candidates from DB
            const matched = await matchCandidates(useCaseSummary, requirements);

            // Also try live web search for more candidates
            let webDiscovered: MatchedCandidate[] = [];
            try {
              const webResults = await discoverFromWeb(
                useCaseSummary,
                requirements.required_features
              );

              // Add web-discovered candidates as matches with lower default score
              webDiscovered = webResults.slice(0, 3).map((r) => ({
                candidate_id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: r.name,
                vendor: r.vendor,
                website_url: r.website_url,
                description: r.description,
                relevance_score: 0.5,
                feature_match: [],
                missing_features: [],
                capabilities: null,
              }));
            } catch {
              // Web search is best-effort
            }

            const allMatched = [...matched, ...webDiscovered];
            updatePayload.matched_candidates = allMatched as unknown as Json;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "matches",
                  content: `Found ${allMatched.length} potential AI tools`,
                  candidates: allMatched.map((c) => ({
                    name: c.name,
                    description: c.description,
                    relevance_score: c.relevance_score,
                    feature_match: c.feature_match,
                  })),
                })}\n\n`
              )
            );
          }

          await serviceClient
            .from("discovery_sessions")
            .update(updatePayload)
            .eq("id", id);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (e) {
          console.error("[discovery/chat] Streaming error:", e);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "An error occurred. Please try again." })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
