export type Experiment = "temperature" | "top_k" | "top_p";

export type SummaryRow = {
  model: string;
  experiment: Experiment;
  temperature: number;
  top_k: number;
  top_p: number;
  n_responses: number;
  similarity: number | null;
  identical_rate: number | null;
  factual_accuracy: number | null;
  factual_wrong_rate: number | null;
  factual_refusal_rate: number | null;
  hallucination_rate: number | null;
  structural_compliance: number | null;
  clean_json_rate: number | null;
  mean_response_words: number | null;
  mean_latency_seconds: number | null;
  mean_tokens_per_second: number | null;
};

export type ResponseRow = {
  prompt_id: string;
  category: "factual" | "trap" | "structure" | "general";
  difficulty: string;
  experiment: Experiment;
  temperature: number;
  top_k: number;
  top_p: number;
  seed: number;
  response: string;
  response_words: number;
  elapsed_seconds: number | null;
  tokens_per_second: number | null;
  factual_correct: number | null;
  hallucinated: number | null;
  refused: number | null;
  factual_wrong: number | null;
  structure_valid: number | null;
};

export type DeterminismRow = {
  model: string;
  experiment: Experiment;
  temperature: number;
  top_k: number;
  top_p: number;
  prompt_id: string;
  similarity: number | null;
  identical_rate: number | null;
};

export type Prompt = {
  id: string;
  category: ResponseRow["category"];
  difficulty: string;
  prompt: string;
  acceptable_answers: string[];
  required_keys?: string[];
};

export type Meta = {
  model: string;
  total_responses: number;
  n_prompts: number;
  n_conditions: number;
  n_seeds: number;
  seeds: number[];
  baseline: { temperature: number; top_k: number; top_p: number };
  overall: Record<string, number | null>;
};

export type Dataset = {
  meta: Meta;
  summary: SummaryRow[];
  responses: ResponseRow[];
  determinism: DeterminismRow[];
  prompts: Prompt[];
};
