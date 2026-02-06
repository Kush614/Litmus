import { createServiceRoleClient } from "@/lib/supabase/server";
import { getGeminiClient, MODELS } from "@/lib/gemini/client";
import { searchWeb } from "@/lib/youcom/client";
import type { ExtractedRequirements, MatchedCandidate } from "@/types/discovery";
import type { DiscoveryCandidateRow } from "@/lib/supabase/types";

/**
 * Matches candidates from the DB against user requirements using Gemini.
 * First filters by category heuristics, then uses Gemini for semantic ranking.
 */
export async function matchCandidates(
  useCaseSummary: string,
  requirements: ExtractedRequirements
): Promise<MatchedCandidate[]> {
  const supabase = createServiceRoleClient();

  // Fetch all active candidates
  const { data: candidates } = await supabase
    .from("discovery_candidates")
    .select("*")
    .eq("is_active", true);

  if (!candidates || candidates.length === 0) return [];

  // Use Gemini to rank all candidates by relevance to the use case
  const ai = getGeminiClient();

  const candidateList = candidates
    .map(
      (c: DiscoveryCandidateRow) =>
        `- ID: ${c.id} | Name: ${c.name} | Category: ${c.category} | Description: ${c.description} | Capabilities: ${(c.capabilities ?? []).join(", ")}`
    )
    .join("\n");

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Given a user's requirements, rank these AI agent tools by relevance.

USER REQUIREMENTS:
- Use case: ${useCaseSummary}
- Domain: ${requirements.domain}
- Required features: ${requirements.required_features.join(", ")}
- Integration needs: ${requirements.integration_needs.join(", ")}
- Budget: ${requirements.budget_tier}

AVAILABLE TOOLS:
${candidateList}

Return ONLY valid JSON array of the top 8 most relevant tools (or fewer if less are relevant), sorted by relevance:
[
  {
    "candidate_id": "uuid from the list above",
    "relevance_score": 0.0-1.0,
    "feature_match": ["features this tool provides that match requirements"],
    "missing_features": ["required features this tool likely lacks"]
  }
]

Only include tools with relevance_score >= 0.3. Be honest - if a tool doesn't fit, give it a low score.`,
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const ranked = JSON.parse(response.text ?? "[]");
  if (!Array.isArray(ranked)) return [];

  // Merge Gemini ranking with candidate data
  return ranked
    .filter((r: { relevance_score: number }) => r.relevance_score >= 0.3)
    .map((r: { candidate_id: string; relevance_score: number; feature_match: string[]; missing_features: string[] }) => {
      const candidate = candidates.find((c: DiscoveryCandidateRow) => c.id === r.candidate_id);
      if (!candidate) return null;
      return {
        candidate_id: candidate.id,
        name: candidate.name,
        vendor: candidate.vendor,
        website_url: candidate.website_url,
        description: candidate.description,
        relevance_score: r.relevance_score,
        feature_match: r.feature_match ?? [],
        missing_features: r.missing_features ?? [],
        capabilities: candidate.capabilities,
      };
    })
    .filter(Boolean) as MatchedCandidate[];
}

/**
 * Researches specific features of a candidate via web search.
 * Updates the candidate's capabilities in the DB.
 */
export async function researchCandidateFeatures(
  candidateId: string,
  candidateName: string,
  requiredFeatures: string[]
): Promise<{ feature: string; supported: boolean; evidence: string }[]> {
  const ai = getGeminiClient();
  const results: { feature: string; supported: boolean; evidence: string }[] = [];

  // Search for the candidate's feature set
  const query = `${candidateName} AI agent features capabilities integrations pricing ${new Date().getFullYear()}`;

  try {
    const searchResults = await searchWeb(query, { count: 5, freshness: "year" });
    const snippets = searchResults.results.web
      .slice(0, 3)
      .map((r) => `Source: ${r.url}\n${r.description}`)
      .join("\n\n");

    // Use Gemini to check each feature
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Based on the web search results about "${candidateName}", determine whether it supports each of these features.

WEB SEARCH RESULTS:
${snippets}

FEATURES TO CHECK:
${requiredFeatures.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Return ONLY valid JSON array:
[
  { "feature": "feature name", "supported": true/false, "evidence": "Brief evidence from search results" }
]`,
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(response.text ?? "[]");
    if (Array.isArray(parsed)) {
      results.push(...parsed);
    }

    // Update candidate capabilities in DB
    const supabase = createServiceRoleClient();
    const supportedFeatures = results
      .filter((r) => r.supported)
      .map((r) => r.feature);

    if (supportedFeatures.length > 0) {
      const { data: existing } = await supabase
        .from("discovery_candidates")
        .select("capabilities")
        .eq("id", candidateId)
        .single();

      const merged = [
        ...new Set([...(existing?.capabilities ?? []), ...supportedFeatures]),
      ];

      await supabase
        .from("discovery_candidates")
        .update({
          capabilities: merged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);
    }
  } catch (e) {
    console.error(`[matcher] Feature research failed for ${candidateName}:`, e);
    // Return unknown status for all features
    for (const feature of requiredFeatures) {
      results.push({ feature, supported: false, evidence: "Research unavailable" });
    }
  }

  return results;
}
