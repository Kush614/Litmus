import { getGeminiClient, MODELS } from "./client";

export type GeneratedProfile = {
  description: string;
  capabilities: string[];
  integrations: string[];
  pricing_model:
    | {
        type: string;
        base_cost: number | undefined;
        per_unit: number | undefined;
        unit: string | undefined;
      }
    | undefined;
};

export type IntelligenceSummary = {
  title: string;
  summary: string;
  source_type: "changelog" | "news" | "review" | "outage" | "pricing_change";
  sentiment: "positive" | "neutral" | "negative";
  relevance_score: number;
};

export async function generateAgentProfile(
  rawContent: string,
  agentName: string,
  vendor: string
): Promise<GeneratedProfile> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze the following web content about the AI agent "${agentName}" by "${vendor}" and extract a structured profile.

Return ONLY valid JSON:
{
  "description": "2-3 sentence description of what this agent does",
  "capabilities": ["array", "of", "capability", "tags"],
  "integrations": ["array", "of", "third-party", "integrations"],
  "pricing_model": { "type": "free|freemium|subscription|usage_based|enterprise", "base_cost": null, "per_unit": null, "unit": null }
}

If pricing info is not found, set pricing_model to null.

WEB CONTENT:
${rawContent.slice(0, 15000)}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text ?? "{}") as GeneratedProfile;
}

export async function summarizeIntelligence(
  content: string,
  sourceUrl: string,
  agentName: string
): Promise<IntelligenceSummary> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze this web content about "${agentName}" and create an intelligence summary.

Return ONLY valid JSON:
{
  "title": "Brief title for this intelligence entry",
  "summary": "2-3 sentence summary of the key information",
  "source_type": "changelog|news|review|outage|pricing_change",
  "sentiment": "positive|neutral|negative",
  "relevance_score": 0.0-1.0
}

SOURCE URL: ${sourceUrl}

CONTENT:
${content.slice(0, 10000)}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text ?? "{}") as IntelligenceSummary;
}
