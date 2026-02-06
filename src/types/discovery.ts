export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

export type ExtractedRequirements = {
  domain: string;
  pain_points: string[];
  required_features: string[];
  nice_to_have_features: string[];
  budget_tier: "free" | "low" | "medium" | "high" | "enterprise";
  integration_needs: string[];
  team_size: string | null;
};

export type MatchedCandidate = {
  candidate_id: string;
  name: string;
  vendor: string;
  website_url: string;
  description: string | null;
  relevance_score: number;
  feature_match: string[];
  missing_features: string[];
  capabilities: string[] | null;
};

export type CustomScenario = {
  id: string;
  title: string;
  description: string;
  task_prompt: string;
  expected_capabilities: string[];
  evaluation_criteria: string;
};

export type ScenarioEvalResult = {
  candidate_id: string;
  scenario_id: string;
  scores: {
    relevance: number;
    capability_fit: number;
    ease_of_integration: number;
    value_for_money: number;
    scalability: number;
  };
  composite_score: number;
  justifications: Record<string, string>;
};

export type RankedAgent = {
  candidate_id: string;
  name: string;
  rank: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  best_for: string;
};

export type FinalRecommendation = {
  ranked_agents: RankedAgent[];
  top_pick_justification: string;
  use_case_summary: string;
};

export type DiscoverySessionStatus =
  | "active"
  | "researching"
  | "evaluating"
  | "complete"
  | "abandoned";

export type DiscoverySession = {
  id: string;
  user_id: string;
  session_type: "chat" | "voice";
  use_case_summary: string | null;
  extracted_requirements: ExtractedRequirements | null;
  conversation_history: ConversationMessage[];
  matched_candidates: MatchedCandidate[] | null;
  custom_scenarios: CustomScenario[] | null;
  evaluation_results: ScenarioEvalResult[] | null;
  final_recommendation: FinalRecommendation | null;
  call_uuid: string | null;
  status: DiscoverySessionStatus;
  created_at: string;
  updated_at: string;
};

export type DiscoveryCandidate = {
  id: string;
  name: string;
  vendor: string;
  website_url: string;
  category: string;
  description: string | null;
  capabilities: string[] | null;
  integrations: string[] | null;
  pricing_model: unknown;
  yc_batch: string | null;
  yc_company_url: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
