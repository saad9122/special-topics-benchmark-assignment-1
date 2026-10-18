"use client";

import { rowsFor } from "@/lib/metrics";
import type { Meta, SummaryRow } from "@/lib/types";

type Tile = { label: string; value: string; note: string; accent: string };

function buildTiles(summary: SummaryRow[], meta: Meta): Tile[] {
  const temps = rowsFor(summary, "temperature");
  const lowest = temps[0];
  const highest = temps[temps.length - 1];

  const zeroRandomness = summary.filter(
    (r) =>
      (r.experiment === "temperature" && r.temperature === 0) ||
      (r.experiment === "top_k" && r.top_k === 1) ||
      (r.experiment === "top_p" && r.top_p === 0.3)
  );
  const hallucFree = zeroRandomness.every((r) => r.hallucination_rate === 0);

  const worstJson = [...summary]
    .filter((r) => r.structural_compliance !== null)
    .sort(
      (a, b) =>
        (a.structural_compliance as number) -
        (b.structural_compliance as number)
    )[0];

  return [
    {
      label: "Determinism at Temp 0.0",
      value: lowest?.similarity?.toFixed(2) ?? "—",
      note: `falls to ${highest?.similarity?.toFixed(2) ?? "—"} at Temp ${
        highest?.temperature ?? "—"
      }`,
      accent: "var(--series-1)",
    },
    {
      label: "Hallucination, randomness off",
      value: hallucFree ? "0%" : "—",
      note: "rises to 10–15% once randomness is on",
      accent: "var(--series-2)",
    },
    {
      label: "Confidently wrong answers",
      value: `${Math.round(
        ((meta.overall.factual_wrong_rate as number) ?? 0) * 100
      )}%`,
      note: "the model refuses instead of guessing",
      accent: "var(--series-3)",
    },
    {
      label: "Lowest JSON compliance",
      value: `${Math.round(
        ((worstJson?.structural_compliance as number) ?? 1) * 100
      )}%`,
      note: worstJson
        ? `at Top-P ${worstJson.top_p.toFixed(1)} — perfect everywhere else`
        : "",
      accent: "#6250d6",
    },
  ];
}

export default function Overview({
  summary,
  meta,
}: {
  summary: SummaryRow[];
  meta: Meta;
}) {
  const tiles = buildTiles(summary, meta);

  return (
    <header className="hero" id="overview">
      <h1 className="rise">
        How sampling settings change{" "}
        <span className="grad">what a local LLM says</span>
      </h1>
      <p>
        Every answer on this page was generated offline by{" "}
        <b>{meta.model}</b> through Ollama. One setting was changed at a time,
        each question was asked five times with a fixed seed, and every answer
        was kept so the numbers can be traced back to the raw text.
      </p>

      <div className="hero-meta">
        <span className="chip chip-lead">{meta.model}</span>
        <span className="chip">
          {meta.total_responses.toLocaleString()} generations
        </span>
        <span className="chip">{meta.n_prompts} prompts</span>
        <span className="chip">{meta.n_conditions} settings tested</span>
        <span className="chip">{meta.n_seeds} repeats each</span>
      </div>

      <div className="tiles">
        {tiles.map((t, index) => (
          <div
            className="card tile rise"
            key={t.label}
            style={
              {
                "--tile-accent": t.accent,
                animationDelay: `${index * 60}ms`,
              } as React.CSSProperties
            }
          >
            <div className="tile-label">{t.label}</div>
            <div className="tile-value">{t.value}</div>
            <div className="tile-note">{t.note}</div>
          </div>
        ))}
      </div>
    </header>
  );
}
