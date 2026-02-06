import { z } from "zod/v4";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { evaluateBenchmark } from "@/lib/gemini/judge";
import { handleApiError, validateWithZod, NotFoundError } from "@/lib/utils/errors";
import { BENCHMARK_TYPES } from "@/lib/utils/constants";
import type { BenchmarkType } from "@/types/benchmark";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const benchmarkRequestSchema = z.object({
  benchmark_type: z.enum(BENCHMARK_TYPES as [string, ...string[]]),
  custom_tasks: z
    .array(
      z.object({
        description: z.string(),
        input: z.unknown(),
        reference_answer: z.string().optional(),
      })
    )
    .optional(),
});

// Default benchmark tasks per type
const DEFAULT_TASKS: Record<BenchmarkType, { description: string; input: unknown }> = {
  text_qa: {
    description:
      "Answer 10 factual questions spanning geography, science, history, and current events.",
    input: {
      questions: [
        "What is the capital of Australia?",
        "Who developed the theory of general relativity?",
        "What is CRISPR-Cas9?",
        "When was the first iPhone released?",
        "What causes tides on Earth?",
      ],
    },
  },
  support_sim: {
    description: "Resolve a simulated customer support ticket about a billing discrepancy.",
    input: {
      scenario:
        "Customer reports being charged twice for a monthly subscription of $29.99. They have a receipt showing the duplicate charge from 3 days ago.",
    },
  },
  tool_use: {
    description: "Execute a tool call to create a GitHub issue with the correct parameters.",
    input: {
      task: "Create a GitHub issue in repo 'acme/app' titled 'Login page returns 500' with label 'bug' and assign it to 'alice'.",
    },
  },
  code_gen: {
    description: "Generate a TypeScript function that validates an email address using a regex.",
    input: {
      requirements:
        "Write a function `isValidEmail(email: string): boolean` with proper JSDoc. Handle edge cases.",
    },
  },
  voice: {
    description: "Evaluate a voice conversation transcript for quality.",
    input: { note: "Voice benchmarks are triggered via the voice evaluation pipeline." },
  },
};

// ---------------------------------------------------------------------------
// POST /api/agents/[slug]/benchmark  -  Trigger a benchmark run
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await params;
    const body = await request.json();
    const data = validateWithZod(benchmarkRequestSchema, body);

    const supabase = createServerClient();
    const serviceClient = createServiceRoleClient();

    // Fetch agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) throw new NotFoundError("Agent");

    const benchmarkType = data.benchmark_type as BenchmarkType;
    const task = data.custom_tasks?.[0] ?? DEFAULT_TASKS[benchmarkType];

    // Create a pending benchmark record
    const { data: benchmark, error: insertError } = await serviceClient
      .from("benchmarks")
      .insert({
        agent_id: agent.id,
        benchmark_type: benchmarkType,
        task_description: task.description,
        input_payload: (task.input ?? {}) as unknown as import("@/lib/supabase/types").Json,
        scores: {} as unknown as import("@/lib/supabase/types").Json,
        composite_score: 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Run evaluation asynchronously so we can return 202 immediately
    (async () => {
      try {
        // For a real implementation the agent_response would come from
        // calling the agent's API. Here we set a placeholder so the
        // Gemini judge can still evaluate the task structure.
        const agentResponse =
          "The agent has not provided a response yet. Evaluate based on the task description alone.";

        const evaluation = await evaluateBenchmark(
          task.description,
          agentResponse,
          benchmarkType,
          (task as { reference_answer?: string }).reference_answer
        );

        await serviceClient
          .from("benchmarks")
          .update({
            agent_response: {
              text: agentResponse,
            } as unknown as import("@/lib/supabase/types").Json,
            gemini_evaluation: evaluation as unknown as import("@/lib/supabase/types").Json,
            scores: evaluation.scores as unknown as import("@/lib/supabase/types").Json,
            composite_score: evaluation.composite_score,
          })
          .eq("id", benchmark.id);

        // Recalculate the agent's overall score
        await serviceClient.rpc("update_agent_score", { agent_uuid: agent.id });
      } catch (e) {
        console.error("[benchmark] Evaluation failed:", e);
      }
    })();

    return Response.json({ benchmark_id: benchmark.id, status: "running" }, { status: 202 });
  } catch (error) {
    return handleApiError(error);
  }
}
