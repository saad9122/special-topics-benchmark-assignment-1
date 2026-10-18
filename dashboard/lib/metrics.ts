import type { Experiment, SummaryRow } from "./types";

export const EXPERIMENTS: {
  key: Experiment;
  label: string;
  axisLabel: string;
  blurb: string;
}[] = [
  {
    key: "temperature",
    label: "Temperature",
    axisLabel: "Temperature",
    blurb: "How much randomness is allowed when picking the next word.",
  },
  {
    key: "top_k",
    label: "Top-K",
    axisLabel: "Top-K (candidate words)",
    blurb: "How many candidate words the model may choose between.",
  },
  {
    key: "top_p",
    label: "Top-P",
    axisLabel: "Top-P (probability mass)",
    blurb: "Keeps only the likeliest words adding up to this probability.",
  },
];

export type MetricKey =
  | "similarity"
  | "identical_rate"
  | "hallucination_rate"
  | "factual_accuracy"
  | "structural_compliance"
  | "mean_latency_seconds"
  | "mean_response_words";

export type MetricDef = {
  key: MetricKey;
  label: string;
  short: string;
  plain: string;
  /** "up" = higher is better, "down" = lower is better */
  better: "up" | "down";
  format: (v: number) => string;
  domain?: [number, number];
  unit: string;
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const two = (v: number) => v.toFixed(2);

export const METRICS: MetricDef[] = [
  {
    key: "similarity",
    label: "Determinism",
    short: "Determinism",
    plain:
      "Ask the same question 5 times — how alike are the answers? 1.00 means word-for-word identical.",
    better: "up",
    format: two,
    domain: [0, 1],
    unit: "similarity",
  },
  {
    key: "identical_rate",
    label: "Identical repeats",
    short: "Identical",
    plain:
      "Share of the 5 repeats that matched the most common answer exactly.",
    better: "up",
    format: pct,
    domain: [0, 1],
    unit: "of repeats",
  },
  {
    key: "hallucination_rate",
    label: "Hallucination",
    short: "Hallucination",
    plain:
      "On prompts about things that do not exist, how often the model invented an answer instead of saying so.",
    better: "down",
    format: pct,
    domain: [0, 1],
    unit: "of trap prompts",
  },
  {
    key: "factual_accuracy",
    label: "Factual accuracy",
    short: "Accuracy",
    plain: "Share of factual questions answered with the correct fact.",
    better: "up",
    format: pct,
    domain: [0, 1],
    unit: "correct",
  },
  {
    key: "structural_compliance",
    label: "Valid JSON",
    short: "Valid JSON",
    plain:
      "Share of JSON prompts answered with parseable JSON carrying exactly the requested keys.",
    better: "up",
    format: pct,
    domain: [0, 1],
    unit: "valid",
  },
  {
    key: "mean_latency_seconds",
    label: "Latency",
    short: "Latency",
    plain: "Average seconds to produce one answer.",
    better: "down",
    format: (v) => `${v.toFixed(2)}s`,
    unit: "per answer",
  },
  {
    key: "mean_response_words",
    label: "Answer length",
    short: "Length",
    plain: "Average number of words per answer.",
    better: "down",
    format: (v) => `${Math.round(v)}`,
    unit: "words",
  },
];

export function metricDef(key: MetricKey): MetricDef {
  return METRICS.find((m) => m.key === key) ?? METRICS[0];
}

/** The x-axis value of a row, for whichever setting that row varies. */
export function settingValue(row: SummaryRow, experiment: Experiment): number {
  return row[experiment];
}

export function rowsFor(
  summary: SummaryRow[],
  experiment: Experiment
): SummaryRow[] {
  return summary
    .filter((r) => r.experiment === experiment)
    .sort((a, b) => settingValue(a, experiment) - settingValue(b, experiment));
}

/**
 * How much a metric moves across a setting's range, as a share of the
 * metric's own span. Used to rank which setting matters most.
 */
export function swing(
  summary: SummaryRow[],
  experiment: Experiment,
  metric: MetricKey
): { from: number; to: number; delta: number } | null {
  const rows = rowsFor(summary, experiment).filter(
    (r) => r[metric] !== null && r[metric] !== undefined
  );
  if (rows.length < 2) return null;

  const values = rows.map((r) => r[metric] as number);
  const from = values[0];
  const to = values[values.length - 1];
  return { from, to, delta: Math.max(...values) - Math.min(...values) };
}

export const CATEGORY_LABEL: Record<string, string> = {
  factual: "Factual",
  trap: "Trap (does not exist)",
  structure: "JSON structure",
  general: "Open-ended",
};
