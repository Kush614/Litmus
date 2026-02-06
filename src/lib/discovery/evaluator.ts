import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  generateCustomScenarios,
  evaluateCandidateForScenario,
  generateFinalRecommendation,
} from "@/lib/gemini/discovery";
import type {
  ExtractedRequirements,
  MatchedCandidate,
  CustomScenario,
  ScenarioEvalResult,
  FinalRecommendation,
} from "@/types/discovery";
import type { Json } from "@/lib/supabase/types";

/**
 * Runs the full evaluation pipeline for a discovery session:
 * 1. Generates custom scenarios from the user's use case
 * 2. Evaluates each candidate against each scenario
 * 3. Aggregates scores and generates final recommendation
 * 4. Updates the session in Supabase
 */
export async function runEvaluationPipeline(
  sessionId: string,
  useCaseSummary: string,
  requirements: ExtractedRequirements,
  matchedCandidates: MatchedCandidate[]
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Update status to evaluating
  await supabase
    .from("discovery_sessions")
    .update({ status: "evaluating", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  try {
    // Step 1: Generate custom scenarios
    const scenarios = await generateCustomScenarios(useCaseSummary, requirements);

    await supabase
      .from("discovery_sessions")
      .update({
        custom_scenarios: scenarios as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Step 2: Evaluate each candidate against each scenario (parallel per candidate)
    const allResults: ScenarioEvalResult[] = [];

    const evaluationPromises = matchedCandidates.map(async (candidate) => {
      const candidateResults: ScenarioEvalResult[] = [];

      for (const scenario of scenarios) {
        try {
          const result = await evaluateCandidateForScenario(
            candidate.name,
            candidate.description ?? "",
            candidate.capabilities ?? [],
            scenario
          );

          candidateResults.push({
            candidate_id: candidate.candidate_id,
            scenario_id: scenario.id,
            scores: result.scores as ScenarioEvalResult["scores"],
            composite_score: result.composite_score,
            justifications: result.justifications,
          });
        } catch (e) {
          console.error(
            `[evaluator] Failed to evaluate ${candidate.name} on ${scenario.title}:`,
            e
          );
        }
      }

      return candidateResults;
    });

    const settled = await Promise.allSettled(evaluationPromises);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      }
    }

    // Save evaluation results
    await supabase
      .from("discovery_sessions")
      .update({
        evaluation_results: allResults as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Step 3: Aggregate scores per candidate
    const candidateAvgScores = matchedCandidates.map((c) => {
      const results = allResults.filter((r) => r.candidate_id === c.candidate_id);
      const avgScore =
        results.length > 0
          ? results.reduce((sum, r) => sum + r.composite_score, 0) / results.length
          : 0;
      return {
        id: c.candidate_id,
        name: c.name,
        description: c.description,
        avgScore,
      };
    });

    // Step 4: Generate final recommendation
    const recommendation: FinalRecommendation = await generateFinalRecommendation(
      useCaseSummary,
      candidateAvgScores,
      allResults
    );

    // Step 5: Update session to complete
    await supabase
      .from("discovery_sessions")
      .update({
        final_recommendation: recommendation as unknown as Json,
        status: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } catch (e) {
    console.error(`[evaluator] Pipeline failed for session ${sessionId}:`, e);
    await supabase
      .from("discovery_sessions")
      .update({
        status: "abandoned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }
}
