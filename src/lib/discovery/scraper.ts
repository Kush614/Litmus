import { createServiceRoleClient } from "@/lib/supabase/server";
import { searchWeb, fetchContent } from "@/lib/youcom/client";
import { generateAgentProfile } from "@/lib/gemini/profiler";
import type { Json } from "@/lib/supabase/types";

type YCCompany = {
  name: string;
  description: string;
  batch: string;
  tags: string[];
  website_url: string;
  yc_url: string;
};

/**
 * Hard-coded seed of YC AI assistant companies scraped from
 * https://www.ycombinator.com/companies/industry/ai-assistant
 * In production, this would be a live scraper, but the YC page
 * requires JS rendering so we maintain a curated list.
 */
const YC_AI_COMPANIES: YCCompany[] = [
  {
    name: "Crow",
    description: "Let users control your app through chat",
    batch: "W2026",
    tags: ["ai-assistant", "chatbot", "enterprise", "generative-ai"],
    website_url: "https://www.crow.ai",
    yc_url: "https://www.ycombinator.com/companies/crow",
  },
  {
    name: "Patientdesk.ai",
    description: "Universal AI front desk for healthcare",
    batch: "W2026",
    tags: ["ai-assistant", "customer-service", "call-center", "conversational-ai"],
    website_url: "https://www.patientdesk.ai",
    yc_url: "https://www.ycombinator.com/companies/patientdesk-ai",
  },
  {
    name: "Vela",
    description: "AI Scheduling Assistant built to handle the ambiguity that breaks scheduling",
    batch: "W2026",
    tags: ["ai-assistant", "calendar", "recruiting", "b2b"],
    website_url: "https://www.vela.ai",
    yc_url: "https://www.ycombinator.com/companies/vela",
  },
  {
    name: "Caretta",
    description: "Sales Intelligence for revenue teams that joins reps in live calls",
    batch: "W2026",
    tags: ["ai-assistant", "sales-enablement", "saas", "sales"],
    website_url: "https://www.caretta.ai",
    yc_url: "https://www.ycombinator.com/companies/caretta",
  },
  {
    name: "Iris",
    description: "Personal agent that observes your day and prepares next actions",
    batch: "F2025",
    tags: ["consumer", "ai-assistant", "email", "calendar", "productivity"],
    website_url: "https://www.iris.ai",
    yc_url: "https://www.ycombinator.com/companies/iris",
  },
  {
    name: "Jarmin",
    description: "24/7 ML engineer employee that handles AI/ML work",
    batch: "F2025",
    tags: ["ai-assistant", "enterprise", "developer-tools", "b2b"],
    website_url: "https://www.jarmin.ai",
    yc_url: "https://www.ycombinator.com/companies/jarmin",
  },
  {
    name: "Lunavo",
    description: "AI assistant for carriers that runs end-to-end backoffice operations",
    batch: "F2025",
    tags: ["logistics", "ai-assistant", "transportation", "operations"],
    website_url: "https://www.lunavo.com",
    yc_url: "https://www.ycombinator.com/companies/lunavo",
  },
  {
    name: "Logical",
    description: "Desktop AI that acts as a proactive, promptless copilot",
    batch: "F2025",
    tags: ["productivity", "ai-assistant", "consumer", "b2b"],
    website_url: "https://www.logical.ai",
    yc_url: "https://www.ycombinator.com/companies/logical",
  },
  {
    name: "Aside",
    description: "Listens to sales calls and surfaces real-time answers from company knowledge",
    batch: "F2025",
    tags: ["saas", "b2b", "sales-enablement", "ai-assistant"],
    website_url: "https://www.aside.com",
    yc_url: "https://www.ycombinator.com/companies/aside",
  },
  {
    name: "Denki",
    description: "Automate internal auditing to comply with financial regulations",
    batch: "F2025",
    tags: ["ai-assistant", "compliance", "finops", "artificial-intelligence"],
    website_url: "https://www.denki.ai",
    yc_url: "https://www.ycombinator.com/companies/denki",
  },
  {
    name: "Cleon",
    description: "AI voice agents that work 24/7 answering and making calls",
    batch: "X2025",
    tags: ["generative-ai", "ai-assistant", "b2b", "enterprise-software"],
    website_url: "https://www.cleon.ai",
    yc_url: "https://www.ycombinator.com/companies/cleon",
  },
  {
    name: "Bond",
    description: "AI Chief of Staff giving CEOs real-time visibility",
    batch: "X2025",
    tags: ["ai-assistant", "b2b", "workflow-automation", "productivity"],
    website_url: "https://www.bond.ai",
    yc_url: "https://www.ycombinator.com/companies/bond",
  },
  {
    name: "Zero",
    description: "Transforms email management with summarization and inbox chat",
    batch: "X2025",
    tags: ["artificial-intelligence", "ai-assistant", "email", "open-source"],
    website_url: "https://www.zero.ai",
    yc_url: "https://www.ycombinator.com/companies/zero",
  },
  {
    name: "Ovlo",
    description: "No-code AI platform for supply chain automation",
    batch: "W2025",
    tags: ["saas", "ai-assistant", "supply-chain", "automation", "retail-tech"],
    website_url: "https://www.ovlo.ai",
    yc_url: "https://www.ycombinator.com/companies/ovlo",
  },
  {
    name: "Truffle AI",
    description: "Make it easy for developers to integrate AI agents into applications",
    batch: "W2025",
    tags: ["generative-ai", "ai-assistant", "developer-tools", "infrastructure"],
    website_url: "https://www.truffle.ai",
    yc_url: "https://www.ycombinator.com/companies/truffle-ai",
  },
  {
    name: "Caseflood.ai",
    description: "Replace admin staff with AI agents for law firms",
    batch: "W2025",
    tags: ["legal", "ai-assistant", "conversational-ai"],
    website_url: "https://www.caseflood.ai",
    yc_url: "https://www.ycombinator.com/companies/caseflood-ai",
  },
  {
    name: "Sandra AI",
    description: "AI operating system for car dealerships",
    batch: "F2024",
    tags: ["ai-assistant", "automotive"],
    website_url: "https://www.sandra.ai",
    yc_url: "https://www.ycombinator.com/companies/sandra-ai",
  },
  {
    name: "April",
    description: "Voice AI Executive assistant for email and calendar management",
    batch: "S2025",
    tags: ["ai-assistant", "calendar", "consumer", "productivity", "email"],
    website_url: "https://www.april.ai",
    yc_url: "https://www.ycombinator.com/companies/april",
  },
  {
    name: "Capy",
    description: "AI software engineer that ships dozens of features in parallel",
    batch: "F2024",
    tags: ["ai-assistant", "ai"],
    website_url: "https://www.capy.ai",
    yc_url: "https://www.ycombinator.com/companies/capy",
  },
  {
    name: "Friday",
    description: "Assistant that learns email patterns and handles them automatically",
    batch: "F2024",
    tags: ["email", "ai-assistant", "productivity", "artificial-intelligence"],
    website_url: "https://www.friday.ai",
    yc_url: "https://www.ycombinator.com/companies/friday",
  },
  {
    name: "Random Labs",
    description: "Slate is a coding agent designed for long hours on hard problems",
    batch: "S2024",
    tags: ["developer-tools", "ai-assistant", "open-source", "ai"],
    website_url: "https://www.randomlabs.ai",
    yc_url: "https://www.ycombinator.com/companies/random-labs",
  },
  {
    name: "Edexia",
    description: "AI Teacher Assistant for grading essays",
    batch: "W2025",
    tags: ["education", "saas", "ai-enhanced-learning", "ai-assistant"],
    website_url: "https://www.edexia.ai",
    yc_url: "https://www.ycombinator.com/companies/edexia",
  },
  {
    name: "Meteor",
    description: "Chrome alternative that can do your work for you",
    batch: "S2025",
    tags: ["consumer", "ai-assistant", "artificial-intelligence"],
    website_url: "https://www.meteor.com",
    yc_url: "https://www.ycombinator.com/companies/meteor",
  },
  {
    name: "Bravi",
    description: "AI operating system for home-services businesses",
    batch: "F2025",
    tags: ["home-services", "manufacturing", "b2b", "ai-assistant"],
    website_url: "https://www.bravi.ai",
    yc_url: "https://www.ycombinator.com/companies/bravi",
  },
  {
    name: "Autumn AI",
    description: "Monitor posts, commits, blogs, and announcements, surfacing buying signals",
    batch: "W2026",
    tags: ["artificial-intelligence", "sales", "ai-assistant", "search"],
    website_url: "https://www.autumn.ai",
    yc_url: "https://www.ycombinator.com/companies/autumn-ai",
  },
];

function inferCategory(tags: string[]): string {
  if (tags.some((t) => ["customer-service", "call-center", "conversational-ai"].includes(t)))
    return "support";
  if (tags.some((t) => ["developer-tools", "web-development"].includes(t))) return "copilot";
  if (tags.some((t) => ["sales", "sales-enablement"].includes(t))) return "sales";
  if (tags.some((t) => ["productivity", "email", "calendar"].includes(t))) return "productivity";
  if (tags.some((t) => ["healthcare-it", "digital-health", "health-tech"].includes(t)))
    return "healthcare";
  if (tags.some((t) => ["logistics", "transportation", "supply-chain", "operations"].includes(t)))
    return "operations";
  if (tags.some((t) => ["legal", "compliance", "finops"].includes(t))) return "legal_finance";
  if (tags.some((t) => ["education", "ai-enhanced-learning"].includes(t))) return "education";
  if (tags.some((t) => ["construction", "automotive", "home-services"].includes(t)))
    return "industry";
  return "general";
}

/**
 * Seeds the discovery_candidates table with YC AI companies.
 * Upserts by name+vendor to avoid duplicates on re-runs.
 */
export async function seedDiscoveryCandidates(): Promise<{ inserted: number; skipped: number }> {
  const supabase = createServiceRoleClient();
  let inserted = 0;
  let skipped = 0;

  for (const company of YC_AI_COMPANIES) {
    const { data: existing } = await supabase
      .from("discovery_candidates")
      .select("id")
      .eq("name", company.name)
      .eq("vendor", company.name)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    await supabase.from("discovery_candidates").insert({
      name: company.name,
      vendor: company.name,
      website_url: company.website_url,
      category: inferCategory(company.tags),
      description: company.description,
      capabilities: company.tags,
      yc_batch: company.batch,
      yc_company_url: company.yc_url,
      source: "yc",
    });

    inserted++;
  }

  return { inserted, skipped };
}

/**
 * Enriches a candidate with web-searched profile data.
 * Uses You.com to fetch website content, then Gemini to extract structured profile.
 */
export async function enrichCandidate(candidateId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: candidate } = await supabase
    .from("discovery_candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (!candidate) return;

  try {
    const contentResponse = await fetchContent(candidate.website_url);
    const profile = await generateAgentProfile(
      contentResponse.content,
      candidate.name,
      candidate.vendor
    );

    await supabase
      .from("discovery_candidates")
      .update({
        description: profile.description || candidate.description,
        capabilities: profile.capabilities?.length
          ? profile.capabilities
          : candidate.capabilities,
        integrations: profile.integrations?.length ? profile.integrations : null,
        pricing_model: profile.pricing_model
          ? (profile.pricing_model as unknown as Json)
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);
  } catch (e) {
    console.error(`[scraper] Failed to enrich candidate ${candidate.name}:`, e);
  }
}

/**
 * Discovers new candidates via live web search based on a use case.
 * Returns candidates found that aren't already in the database.
 */
export async function discoverFromWeb(
  useCase: string,
  requiredFeatures: string[]
): Promise<{ name: string; vendor: string; website_url: string; description: string }[]> {
  const queries = [
    `best AI agent tools for ${useCase} ${new Date().getFullYear()}`,
    `top AI assistant solutions ${requiredFeatures.slice(0, 3).join(" ")}`,
    `${useCase} AI automation platform comparison`,
  ];

  const discovered: { name: string; vendor: string; website_url: string; description: string }[] =
    [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const results = await searchWeb(query, { count: 5, freshness: "year" });
      for (const result of results.results.web.slice(0, 3)) {
        const url = new URL(result.url).origin;
        if (seen.has(url)) continue;
        seen.add(url);
        discovered.push({
          name: result.title?.split(/[|\-–—]/)[0]?.trim() ?? "Unknown",
          vendor: new URL(result.url).hostname.replace("www.", ""),
          website_url: url,
          description: result.description ?? "",
        });
      }
    } catch {
      // Skip failed queries
    }
  }

  return discovered;
}
