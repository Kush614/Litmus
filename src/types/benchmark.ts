export type BenchmarkType = "text_qa" | "support_sim" | "tool_use" | "code_gen" | "voice";

export type BenchmarkScores = {
  accuracy: number;
  coherence: number;
  helpfulness: number;
  hallucination: number;
  completeness: number;
};

export type GeminiEvaluation = {
  scores: BenchmarkScores;
  justifications: Record<keyof BenchmarkScores, string>;
  composite_score: number;
  raw_response: string;
};

export type BenchmarkTask = {
  description: string;
  input: unknown;
  reference_answer: string | undefined;
};

export type BenchmarkRequest = {
  benchmark_type: BenchmarkType;
  custom_tasks: BenchmarkTask[] | undefined;
};

export type BenchmarkResult = {
  id: string;
  agent_id: string;
  benchmark_type: BenchmarkType;
  task_description: string;
  scores: BenchmarkScores;
  composite_score: number;
  gemini_evaluation: GeminiEvaluation | undefined;
  created_at: string;
};
