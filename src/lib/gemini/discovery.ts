import { getGeminiClient, MODELS } from "./client";
import type { ConversationMessage, ExtractedRequirements, CustomScenario } from "@/types/discovery";

const DISCOVERY_SYSTEM_PROMPT = `You are Litmus, an AI consultant that helps businesses find the right AI agent tools for their needs. You work for an AI agent evaluation marketplace.

Your goal is to understand the user's:
1. Business domain and specific pain points
2. Required features and integrations
3. Budget constraints
4. Team size and technical capacity

Be conversational, ask clarifying follow-up questions, and be specific. After gathering enough information (usually 2-4 exchanges), tell the user you're ready to search for matching tools and summarize what you understood.

When you have enough information, end your message with the exact marker: [READY_TO_SEARCH]

Keep responses concise (2-4 sentences max per turn). Do NOT list agents or make recommendations yet - just gather requirements.`;

/**
 * Streams a discovery chat response from Gemini.
 * Returns an async generator of text chunks.
 */
export async function* streamDiscoveryChat(
  conversationHistory: ConversationMessage[]
): AsyncGenerator<string> {
  const ai = getGeminiClient();

  const contents = [
    { role: "user" as const, parts: [{ text: DISCOVERY_SYSTEM_PROMPT }] },
    { role: "model" as const, parts: [{ text: "Understood. I'll help the user find the right AI agent tools by asking about their needs." }] },
    ...conversationHistory.map((msg) => ({
      role: (msg.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: msg.content }],
    })),
  ];

  const response = await ai.models.generateContentStream({
    model: MODELS.FLASH,
    contents,
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

/**
 * Extracts structured requirements from conversation history.
 */
export async function extractRequirements(
  conversationHistory: ConversationMessage[]
): Promise<ExtractedRequirements> {
  const ai = getGeminiClient();

  const conversationText = conversationHistory
    .map((m) => `[${m.role}]: ${m.content}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze this conversation between a user and an AI consultant. Extract the user's requirements for an AI agent tool.

Return ONLY valid JSON:
{
  "domain": "the business domain (e.g., customer support, sales, healthcare, legal, etc.)",
  "pain_points": ["specific problems the user described"],
  "required_features": ["must-have features"],
  "nice_to_have_features": ["optional features mentioned"],
  "budget_tier": "free|low|medium|high|enterprise",
  "integration_needs": ["specific tools/platforms they need to integrate with"],
  "team_size": "small/medium/large or null if not mentioned"
}

CONVERSATION:
${conversationText}`,
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return {
    domain: parsed.domain ?? "general",
    pain_points: parsed.pain_points ?? [],
    required_features: parsed.required_features ?? [],
    nice_to_have_features: parsed.nice_to_have_features ?? [],
    budget_tier: parsed.budget_tier ?? "medium",
    integration_needs: parsed.integration_needs ?? [],
    team_size: parsed.team_size ?? null,
  };
}

/**
 * Generates custom evaluation scenarios based on the user's specific use case.
 */
export async function generateCustomScenarios(
  useCaseSummary: string,
  requirements: ExtractedRequirements
): Promise<CustomScenario[]> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Generate 3-5 realistic test scenarios to evaluate AI agent tools for this use case.

USE CASE: ${useCaseSummary}
DOMAIN: ${requirements.domain}
REQUIRED FEATURES: ${requirements.required_features.join(", ")}
INTEGRATION NEEDS: ${requirements.integration_needs.join(", ")}

Each scenario should test a specific capability relevant to the user's needs.

Return ONLY valid JSON array:
[
  {
    "id": "scenario_1",
    "title": "Brief scenario title",
    "description": "What this scenario tests and why it matters for this use case",
    "task_prompt": "The actual task/question to evaluate the agent on",
    "expected_capabilities": ["capabilities needed to handle this well"],
    "evaluation_criteria": "What a good response looks like"
  }
]`,
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const scenarios = JSON.parse(response.text ?? "[]");
  return Array.isArray(scenarios) ? scenarios : [];
}

/**
 * Evaluates a candidate agent against a scenario using Gemini as judge.
 */
export async function evaluateCandidateForScenario(
  candidateName: string,
  candidateDescription: string,
  candidateCapabilities: string[],
  scenario: CustomScenario
): Promise<{
  scores: Record<string, number>;
  composite_score: number;
  justifications: Record<string, string>;
}> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are evaluating whether the AI agent "${candidateName}" would be a good fit for a specific task scenario.

AGENT INFO:
- Name: ${candidateName}
- Description: ${candidateDescription}
- Known capabilities: ${candidateCapabilities.join(", ")}

SCENARIO:
- Title: ${scenario.title}
- Task: ${scenario.task_prompt}
- Expected capabilities: ${scenario.expected_capabilities.join(", ")}
- Evaluation criteria: ${scenario.evaluation_criteria}

Based on what you know about this agent and its capabilities, score it on these dimensions (0-100):

- relevance: How relevant is this agent to the task?
- capability_fit: Does the agent have the right capabilities?
- ease_of_integration: How easy would it be to integrate and use?
- value_for_money: Considering typical pricing for this type of tool
- scalability: Can it grow with the user's needs?

Return ONLY valid JSON:
{
  "scores": { "relevance": N, "capability_fit": N, "ease_of_integration": N, "value_for_money": N, "scalability": N },
  "justifications": { "relevance": "...", "capability_fit": "...", "ease_of_integration": "...", "value_for_money": "...", "scalability": "..." }
}`,
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  const scores = parsed.scores ?? {
    relevance: 0,
    capability_fit: 0,
    ease_of_integration: 0,
    value_for_money: 0,
    scalability: 0,
  };

  const weights = {
    relevance: 0.3,
    capability_fit: 0.3,
    ease_of_integration: 0.15,
    value_for_money: 0.15,
    scalability: 0.1,
  };

  let composite = 0;
  for (const [key, weight] of Object.entries(weights)) {
    composite += (scores[key] ?? 0) * weight;
  }

  return {
    scores,
    composite_score: Math.round(composite * 100) / 100,
    justifications: parsed.justifications ?? {},
  };
}

/**
 * Generates the final ranked recommendation.
 */
export async function generateFinalRecommendation(
  useCaseSummary: string,
  candidates: { id: string; name: string; description: string | null; avgScore: number }[],
  allResults: { candidate_id: string; scores: Record<string, number>; justifications: Record<string, string> }[]
): Promise<{
  ranked_agents: {
    candidate_id: string;
    name: string;
    rank: number;
    overall_score: number;
    strengths: string[];
    weaknesses: string[];
    best_for: string;
  }[];
  top_pick_justification: string;
  use_case_summary: string;
}> {
  const ai = getGeminiClient();

  const candidateData = candidates
    .sort((a, b) => b.avgScore - a.avgScore)
    .map((c, i) => {
      const results = allResults.filter((r) => r.candidate_id === c.id);
      return `${i + 1}. ${c.name} (avg score: ${c.avgScore.toFixed(1)})
  Description: ${c.description}
  Scenario results: ${JSON.stringify(results.map((r) => r.justifications))}`;
    })
    .join("\n\n");

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Based on the evaluation results, provide a final recommendation for this use case.

USE CASE: ${useCaseSummary}

CANDIDATES (sorted by score):
${candidateData}

Return ONLY valid JSON:
{
  "ranked_agents": [
    {
      "candidate_id": "uuid",
      "name": "Agent Name",
      "rank": 1,
      "overall_score": 85.5,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1"],
      "best_for": "One-sentence description of ideal use"
    }
  ],
  "top_pick_justification": "2-3 sentence explanation of why the #1 pick is the best choice",
  "use_case_summary": "1-sentence summary of the user's use case"
}`,
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text ?? "{}");

  // Ensure candidate_ids and scores are correct from our data
  const ranked = (parsed.ranked_agents ?? []).map(
    (agent: { name: string; strengths: string[]; weaknesses: string[]; best_for: string }, idx: number) => {
      const match = candidates.find((c) => c.name === agent.name);
      return {
        candidate_id: match?.id ?? "",
        name: agent.name,
        rank: idx + 1,
        overall_score: match?.avgScore ?? 0,
        strengths: agent.strengths ?? [],
        weaknesses: agent.weaknesses ?? [],
        best_for: agent.best_for ?? "",
      };
    }
  );

  return {
    ranked_agents: ranked,
    top_pick_justification: parsed.top_pick_justification ?? "Unable to generate recommendation.",
    use_case_summary: parsed.use_case_summary ?? useCaseSummary,
  };
}
