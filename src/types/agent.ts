export type AgentCategory = "support" | "copilot" | "research" | "voice" | "design" | "general";

export type PricingModel = {
  type: "free" | "freemium" | "subscription" | "usage_based" | "enterprise";
  base_cost: number | undefined;
  per_unit: number | undefined;
  unit: string | undefined;
};

export type AgentSearchParams = {
  query: string | undefined;
  category: AgentCategory | undefined;
  sort_by: "overall_score" | "total_evaluations" | "created_at" | "name";
  sort_order: "asc" | "desc";
  page: number;
  per_page: number;
};

export type AgentSubmission = {
  name: string;
  vendor: string;
  category: AgentCategory;
  website_url: string;
  api_endpoint: string | undefined;
};

export type AgentProfile = {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  description: string | undefined;
  category: AgentCategory;
  website_url: string | undefined;
  api_endpoint: string | undefined;
  pricing_model: PricingModel | undefined;
  capabilities: string[];
  integrations: string[];
  overall_score: number | undefined;
  total_evaluations: number;
  submitted_by: string | undefined;
  created_at: string;
  updated_at: string;
};

export type AgentListItem = Pick<
  AgentProfile,
  | "id"
  | "slug"
  | "name"
  | "vendor"
  | "category"
  | "overall_score"
  | "total_evaluations"
  | "capabilities"
>;
