import { z } from "zod/v4";
import { evaluateBenchmark, evaluateVoiceTranscript } from "@/lib/gemini/judge";
import { handleApiError, validateWithZod, ValidationError } from "@/lib/utils/errors";
import type { BenchmarkType } from "@/types/benchmark";
import type { TranscriptEntry } from "@/types/evaluation";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const evaluationRequestSchema = z.object({
  type: z.enum(["benchmark", "voice", "transcript"]),
  task_description: z.string().min(1),
  agent_response: z.string().optional(),
  reference_answer: z.string().optional(),
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "agent"]),
        text: z.string(),
        timestamp: z.number(),
      })
    )
    .optional(),
  benchmark_type: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/evaluate  -  Generic Gemini evaluation endpoint
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const data = validateWithZod(evaluationRequestSchema, body);

    if (data.type === "benchmark") {
      // Benchmark evaluation requires agent_response
      if (!data.agent_response) {
        throw new ValidationError("agent_response is required for benchmark evaluations");
      }

      const benchmarkType = (data.benchmark_type ?? "text_qa") as BenchmarkType;

      const evaluation = await evaluateBenchmark(
        data.task_description,
        data.agent_response,
        benchmarkType,
        data.reference_answer
      );

      return Response.json({
        type: "benchmark",
        scores: evaluation.scores,
        justifications: evaluation.justifications,
        composite_score: evaluation.composite_score,
      });
    }

    if (data.type === "voice" || data.type === "transcript") {
      // Voice / transcript evaluation requires a transcript array
      if (!data.transcript || data.transcript.length === 0) {
        throw new ValidationError("transcript is required for voice/transcript evaluations");
      }

      const evaluation = await evaluateVoiceTranscript(
        data.transcript as TranscriptEntry[],
        data.task_description
      );

      return Response.json({
        type: data.type,
        scores: evaluation.scores,
        justifications: evaluation.justifications,
        composite_score: evaluation.composite_score,
      });
    }

    throw new ValidationError(`Unknown evaluation type: ${data.type}`);
  } catch (error) {
    return handleApiError(error);
  }
}
