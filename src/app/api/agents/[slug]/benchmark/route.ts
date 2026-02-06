import { z } from "zod/v4";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { evaluateBenchmark } from "@/lib/gemini/judge";
import {
  handleApiError,
  validateWithZod,
  NotFoundError,
  ValidationError,
} from "@/lib/utils/errors";
import { BENCHMARK_TYPES } from "@/lib/utils/constants";
import type { BenchmarkType } from "@/types/benchmark";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const benchmarkRequestSchema = z.object({
  benchmark_type: z.enum(BENCHMARK_TYPES as [string, ...string[]]),
  agent_response: z.string().min(1).optional(),
  custom_tasks: z
    .array(
      z.object({
        description: z.string(),
        input: z.unknown(),
        reference_answer: z.string().optional(),
        agent_response: z.string().min(1).optional(),
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

function extractTextFromResponsePayload(payload: unknown): string | undefined {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const data = payload as Record<string, unknown>;
  const directTextKeys = ["response", "answer", "output", "text", "content", "message"];

  for (const key of directTextKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const firstChoice = choices[0] as Record<string, unknown>;
    if (typeof firstChoice.text === "string" && firstChoice.text.trim().length > 0) {
      return firstChoice.text.trim();
    }

    const message = firstChoice.message;
    if (message && typeof message === "object") {
      const content = (message as Record<string, unknown>).content;
      if (typeof content === "string" && content.trim().length > 0) {
        return content.trim();
      }
    }
  }

  return undefined;
}

async function fetchAgentResponseFromEndpoint(params: {
  apiEndpoint: string;
  benchmarkType: BenchmarkType;
  taskDescription: string;
  taskInput: unknown;
}): Promise<string> {
  let endpoint: URL;
  try {
    endpoint = new URL(params.apiEndpoint);
  } catch {
    throw new ValidationError("Agent API endpoint is not a valid URL");
  }

  if (!["http:", "https:"].includes(endpoint.protocol)) {
    throw new ValidationError("Agent API endpoint must use http:// or https://");
  }

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
    body: JSON.stringify({
      benchmark_type: params.benchmarkType,
      task_description: params.taskDescription,
      input: params.taskInput,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const responseText = await response.text();
    const detail = responseText.slice(0, 500);
    throw new ValidationError(
      `Agent endpoint returned ${response.status} ${response.statusText}`,
      detail
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json();
    const responseText = extractTextFromResponsePayload(payload);
    if (!responseText) {
      throw new ValidationError(
        "Unable to extract textual agent response from endpoint JSON payload",
        payload
      );
    }
    return responseText;
  }

  const rawText = (await response.text()).trim();
  if (!rawText) {
    throw new ValidationError("Agent endpoint returned an empty response body");
  }

  return rawText;
}

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
      .select("id, name, api_endpoint")
      .eq("slug", slug)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) throw new NotFoundError("Agent");

    const benchmarkType = data.benchmark_type as BenchmarkType;
    const task = data.custom_tasks?.[0] ?? DEFAULT_TASKS[benchmarkType];

    const providedAgentResponse = data.agent_response ?? data.custom_tasks?.[0]?.agent_response;
    const agentResponse =
      providedAgentResponse && providedAgentResponse.trim().length > 0
        ? providedAgentResponse.trim()
        : agent.api_endpoint
          ? await fetchAgentResponseFromEndpoint({
              apiEndpoint: agent.api_endpoint,
              benchmarkType,
              taskDescription: task.description,
              taskInput: task.input,
            })
          : null;

    if (!agentResponse) {
      throw new ValidationError(
        "No agent response source available. Provide agent_response in the request or configure api_endpoint for the agent."
      );
    }

    const evaluation = await evaluateBenchmark(
      task.description,
      agentResponse,
      benchmarkType,
      (task as { reference_answer?: string }).reference_answer
    );

    const { data: benchmark, error: insertError } = await serviceClient
      .from("benchmarks")
      .insert({
        agent_id: agent.id,
        benchmark_type: benchmarkType,
        task_description: task.description,
        input_payload: (task.input ?? {}) as unknown as import("@/lib/supabase/types").Json,
        agent_response: {
          text: agentResponse,
        } as unknown as import("@/lib/supabase/types").Json,
        gemini_evaluation: evaluation as unknown as import("@/lib/supabase/types").Json,
        scores: evaluation.scores as unknown as import("@/lib/supabase/types").Json,
        composite_score: evaluation.composite_score,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { error: scoreUpdateError } = await serviceClient.rpc("update_agent_score", {
      agent_uuid: agent.id,
    });

    if (scoreUpdateError) {
      console.error("[benchmark] Failed to update aggregate score:", scoreUpdateError);
    }

    return Response.json(
      {
        id: benchmark.id,
        benchmark_id: benchmark.id,
        scores: evaluation.scores,
        composite_score: evaluation.composite_score,
        justifications: evaluation.justifications,
        status: "complete",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
