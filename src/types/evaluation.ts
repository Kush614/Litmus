export type EvaluationDimension =
  | "accuracy"
  | "coherence"
  | "helpfulness"
  | "hallucination"
  | "completeness"
  | "naturalness"
  | "tone"
  | "latency";

export type TranscriptEntry = {
  role: "user" | "agent";
  text: string;
  timestamp: number;
};

export type EvaluationRequest = {
  type: "benchmark" | "voice" | "transcript";
  task_description: string;
  agent_response: string;
  reference_answer: string | undefined;
  transcript: TranscriptEntry[] | undefined;
};

export type EvaluationResponse = {
  scores: Record<string, number>;
  justifications: Record<string, string>;
  composite_score: number;
};
