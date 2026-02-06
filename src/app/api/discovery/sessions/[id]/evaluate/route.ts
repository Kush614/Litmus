import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/utils/errors";
import { runEvaluationPipeline } from "@/lib/discovery/evaluator";
import type {
  ConversationMessage,
  ExtractedRequirements,
  MatchedCandidate,
} from "@/types/discovery";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/discovery/sessions/[id]/evaluate — Trigger evaluation of matched candidates
export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const serviceClient = createServiceRoleClient();
    const { data: session, error } = await serviceClient
      .from("discovery_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !session) throw new NotFoundError("Discovery session");

    const matched = session.matched_candidates as unknown as MatchedCandidate[] | null;
    if (!matched || matched.length === 0) {
      throw new ValidationError("No matched candidates to evaluate. Complete the chat first.");
    }

    const requirements =
      (session.extracted_requirements as unknown as ExtractedRequirements) ?? {
        domain: "general",
        pain_points: [],
        required_features: [],
        nice_to_have_features: [],
        budget_tier: "medium" as const,
        integration_needs: [],
        team_size: null,
      };

    const history = (session.conversation_history ?? []) as unknown as ConversationMessage[];
    const useCaseSummary =
      session.use_case_summary ??
      history
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join(". ");

    // Optionally accept candidate_ids to evaluate a subset
    let candidatesToEvaluate = matched;
    try {
      const body = await request.json();
      if (body.candidate_ids && Array.isArray(body.candidate_ids)) {
        candidatesToEvaluate = matched.filter((c) =>
          body.candidate_ids.includes(c.candidate_id)
        );
      }
    } catch {
      // No body or invalid JSON — evaluate all
    }

    // Fire-and-forget: run evaluation pipeline async
    runEvaluationPipeline(id, useCaseSummary, requirements, candidatesToEvaluate).catch((e) => {
      console.error(`[evaluate] Pipeline error for session ${id}:`, e);
    });

    return Response.json(
      {
        status: "evaluating",
        candidates_count: candidatesToEvaluate.length,
        message: "Evaluation started. Poll the session endpoint for results.",
      },
      { status: 202 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
