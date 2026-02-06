import type { AgentCategory } from "@/types/agent";
import type { BenchmarkType } from "@/types/benchmark";

export const AGENT_CATEGORIES: AgentCategory[] = [
  "support",
  "copilot",
  "research",
  "voice",
  "design",
  "general",
];

export const BENCHMARK_TYPES: BenchmarkType[] = [
  "text_qa",
  "support_sim",
  "tool_use",
  "code_gen",
  "voice",
];

export const SCORE_WEIGHTS = {
  accuracy: 0.3,
  coherence: 0.15,
  helpfulness: 0.25,
  hallucination: 0.2,
  completeness: 0.1,
} as const;

export const VOICE_SCORE_WEIGHTS = {
  naturalness: 0.2,
  helpfulness: 0.25,
  latency: 0.2,
  accuracy: 0.2,
  tone: 0.15,
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_COMPARE_AGENTS = 4;
export const INTELLIGENCE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export const GEMINI_MODELS = {
  FLASH: "gemini-2.5-flash",
  PRO: "gemini-2.5-pro",
  NATIVE_AUDIO: "gemini-2.5-flash-native-audio-preview-12-2025",
  TTS: "gemini-2.5-flash-preview-tts",
} as const;

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  support: "Customer Support",
  copilot: "Coding Copilot",
  research: "Research",
  voice: "Voice Agent",
  design: "Design",
  general: "General",
};

export const BENCHMARK_TYPE_LABELS: Record<BenchmarkType, string> = {
  text_qa: "Text Q&A",
  support_sim: "Support Simulation",
  tool_use: "Tool Use",
  code_gen: "Code Generation",
  voice: "Voice",
};
