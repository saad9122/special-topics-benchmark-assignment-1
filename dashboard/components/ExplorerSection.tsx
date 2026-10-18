"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABEL, EXPERIMENTS } from "@/lib/metrics";
import type {
  DeterminismRow,
  Experiment,
  Prompt,
  ResponseRow,
} from "@/lib/types";

function formatSetting(experiment: Experiment, value: number): string {
  if (experiment === "top_k") return String(value);
  return value.toFixed(1);
}

/** Score badges shown above each answer, so the scoring is never a black box. */
function ScoreBadges({ row }: { row: ResponseRow }) {
  const badges: { text: string; cls: string }[] = [];

  if (row.category === "factual") {
    if (row.factual_correct === 1)
      badges.push({ text: "✓ correct", cls: "badge-good" });
    else if (row.refused === 1)
      badges.push({ text: "— refused", cls: "badge-warning" });
    else badges.push({ text: "✕ wrong", cls: "badge-critical" });
  }

  if (row.category === "trap") {
    badges.push(
      row.hallucinated === 1
        ? { text: "✕ invented an answer", cls: "badge-critical" }
        : { text: "✓ said it does not exist", cls: "badge-good" }
    );
  }

  if (row.category === "structure") {
    badges.push(
      row.structure_valid === 1
        ? { text: "✓ valid JSON", cls: "badge-good" }
        : { text: "✕ invalid JSON", cls: "badge-critical" }
    );
  }

  return (
    <>
      {badges.map((b) => (
        <span key={b.text} className={`badge ${b.cls}`}>
          {b.text}
        </span>
      ))}
      <span className="badge">{row.response_words} words</span>
      {row.elapsed_seconds !== null && (
        <span className="badge">{row.elapsed_seconds.toFixed(2)}s</span>
      )}
    </>
  );
}

export default function ExplorerSection({
  responses,
  prompts,
  determinism,
}: {
  responses: ResponseRow[];
  prompts: Prompt[];
  determinism: DeterminismRow[];
}) {
  const [promptId, setPromptId] = useState(prompts[0]?.id ?? "");
  const [experiment, setExperiment] = useState<Experiment>("temperature");

  const prompt = prompts.find((p) => p.id === promptId);
  const expDef = EXPERIMENTS.find((e) => e.key === experiment)!;

  /** All answers to this prompt, for this setting sweep, grouped by value. */
  const columns = useMemo(() => {
    const rows = responses.filter(
      (r) => r.prompt_id === promptId && r.experiment === experiment
    );

    const byValue = new Map<number, ResponseRow[]>();
    for (const row of rows) {
      const value = row[experiment];
      if (!byValue.has(value)) byValue.set(value, []);
      byValue.get(value)!.push(row);
    }

    return [...byValue.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([value, items]) => {
        const sorted = [...items].sort((a, b) => a.seed - b.seed);
        const texts = sorted.map((r) => r.response.trim());
        const unique = new Set(texts).size;

        const det = determinism.find(
          (d) =>
            d.prompt_id === promptId &&
            d.experiment === experiment &&
            d[experiment] === value
        );

        return { value, items: sorted, unique, similarity: det?.similarity };
      });
  }, [responses, determinism, promptId, experiment]);

  const isJsonPrompt = prompt?.category === "structure";

  return (
    <section className="section" id="explorer">
      <div className="section-head">
        <div className="section-kicker">Section 2</div>
        <h2 className="section-title">Explore what the model actually said</h2>
        <p className="section-sub">
          Every one of the stored answers, straight from the results file. Pick
          a question and a setting, and compare the five repeats side by side.
          Columns on the left are the low, more conservative values; columns on
          the right are the high, more random ones.
        </p>
      </div>

      <div className="card controls">
        <div className="control" style={{ flex: "1 1 420px" }}>
          <label className="control-label" htmlFor="prompt-select">
            Question
          </label>
          <select
            id="prompt-select"
            value={promptId}
            onChange={(e) => setPromptId(e.target.value)}
          >
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                [{CATEGORY_LABEL[p.category] ?? p.category}] {p.prompt.slice(0, 72)}
                {p.prompt.length > 72 ? "…" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="control">
          <span className="control-label">Setting to sweep</span>
          <div className="segmented" role="group" aria-label="Setting to sweep">
            {EXPERIMENTS.map((e) => (
              <button
                key={e.key}
                aria-pressed={e.key === experiment}
                onClick={() => setExperiment(e.key)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {prompt && (
        <div className="prompt-box">
          <div className="label">Prompt sent to the model</div>
          <div className="prompt-text">{prompt.prompt}</div>
          {prompt.acceptable_answers.length > 0 && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              Accepted answer: <b>{prompt.acceptable_answers.join(" / ")}</b>
            </div>
          )}
          {prompt.category === "trap" && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              This thing does not exist. The only correct answer is to say so.
            </div>
          )}
        </div>
      )}

      {columns.length === 0 ? (
        <div className="card empty">No stored answers for this combination.</div>
      ) : (
        <div className="response-grid">
          {columns.map((col) => (
            <div className="card" key={col.value}>
              <div className="response-col-head">
                <div>
                  <div className="response-col-value">
                    {expDef.label} {formatSetting(experiment, col.value)}
                  </div>
                  <div className="response-col-stat">
                    {col.unique === 1
                      ? "all 5 repeats identical"
                      : `${col.unique} different answers out of 5`}
                    {col.similarity !== undefined && col.similarity !== null
                      ? ` · similarity ${col.similarity.toFixed(2)}`
                      : ""}
                  </div>
                </div>
              </div>

              {col.items.map((row) => (
                <div className="response-item" key={row.seed}>
                  <div className="response-meta">
                    <span className="seed-tag">Seed {row.seed}</span>
                    <ScoreBadges row={row} />
                  </div>
                  <p
                    className={`response-text${isJsonPrompt ? " is-json" : ""}`}
                  >
                    {row.response.trim() || "(empty response)"}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="callout">
        <b>What to look for.</b> On the left-hand columns the five repeats are
        usually word-for-word the same. As the setting rises, the wording starts
        to drift — and on the trap questions, that drift is where invented
        answers appear.
      </div>
    </section>
  );
}
