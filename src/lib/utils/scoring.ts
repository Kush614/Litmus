import type { BenchmarkScores } from "@/types/benchmark";
import type { VoiceEvalScores } from "@/types/voice";

const BENCHMARK_WEIGHTS: Record<keyof BenchmarkScores, number> = {
  accuracy: 0.3,
  coherence: 0.15,
  helpfulness: 0.25,
  hallucination: 0.2,
  completeness: 0.1,
};

const VOICE_WEIGHTS: Record<keyof VoiceEvalScores, number> = {
  naturalness: 0.2,
  helpfulness: 0.25,
  latency: 0.2,
  accuracy: 0.2,
  tone: 0.15,
};

export function computeBenchmarkComposite(scores: BenchmarkScores): number {
  let total = 0;
  for (const [key, weight] of Object.entries(BENCHMARK_WEIGHTS)) {
    total += (scores[key as keyof BenchmarkScores] ?? 0) * weight;
  }
  return Math.round(total * 100) / 100;
}

export function computeVoiceComposite(scores: VoiceEvalScores): number {
  let total = 0;
  for (const [key, weight] of Object.entries(VOICE_WEIGHTS)) {
    total += (scores[key as keyof VoiceEvalScores] ?? 0) * weight;
  }
  return Math.round(total * 100) / 100;
}

export function computeOverallScore(benchmarkScores: number[], voiceScores: number[]): number {
  const all = [...benchmarkScores, ...voiceScores];
  if (all.length === 0) return 0;
  const sum = all.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / all.length) * 100) / 100;
}

export function normalizeScore(raw: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.round(((raw - min) / (max - min)) * 100 * 100) / 100;
}

export function formatScore(score: number | null | undefined): string {
  if (score === undefined || score === null) return "N/A";
  return score.toFixed(1);
}
