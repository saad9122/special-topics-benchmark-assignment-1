"use client";

import { useMemo, useState } from "react";
import EffectChart, { type Point } from "./EffectChart";
import {
  EXPERIMENTS,
  METRICS,
  metricDef,
  rowsFor,
  swing,
  type MetricKey,
} from "@/lib/metrics";
import type { SummaryRow } from "@/lib/types";

const SERIES_COLOR: Record<string, string> = {
  temperature: "var(--series-1)",
  top_k: "var(--series-2)",
  top_p: "var(--series-3)",
};

function formatSetting(experiment: string, value: number): string {
  if (experiment === "top_k") return String(value);
  return value.toFixed(1);
}

/** The table always shows the same columns; the chosen metric is marked. */
const TABLE_COLUMNS = METRICS.map((m) => ({ key: m.key, label: m.short }));

export default function EffectsSection({ summary }: { summary: SummaryRow[] }) {
  const [metricKey, setMetricKey] = useState<MetricKey>("similarity");
  const [showTable, setShowTable] = useState(false);
  const metric = metricDef(metricKey);

  const charts = useMemo(
    () =>
      EXPERIMENTS.map((exp) => {
        const rows = rowsFor(summary, exp.key);
        const points: Point[] = rows.map((r) => ({
          x: r[exp.key],
          y: (r[metricKey] ?? null) as number | null,
          label: formatSetting(exp.key, r[exp.key]),
        }));
        return { exp, points, move: swing(summary, exp.key, metricKey) };
      }),
    [summary, metricKey]
  );

  const ranked = [...charts]
    .filter((c) => c.move)
    .sort((a, b) => (b.move?.delta ?? 0) - (a.move?.delta ?? 0));

  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  return (
    <section className="section" id="effects">
      <div className="section-head">
        <div className="section-kicker">Section 1</div>
        <h2 className="section-title">The effect of each setting</h2>
        <p className="section-sub">
          Pick a measurement, then read the three charts. Each one varies a
          single setting while the other two stay at the baseline, so any
          movement in the line is caused by that setting alone.
        </p>
      </div>

      <div className="card controls">
        <div className="control">
          <span className="control-label">Measurement</span>
          <div className="segmented" role="group" aria-label="Measurement">
            {METRICS.map((m) => (
              <button
                key={m.key}
                aria-pressed={m.key === metricKey}
                onClick={() => setMetricKey(m.key)}
              >
                {m.short}
              </button>
            ))}
          </div>
        </div>

        <div className="control" style={{ marginLeft: "auto" }}>
          <span className="control-label">View</span>
          <button
            className="toggle"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            {showTable ? "Show charts" : "Show as table"}
          </button>
        </div>
      </div>

      <div className="callout" style={{ marginTop: 0, marginBottom: 18 }}>
        <b>{metric.label}.</b> {metric.plain}{" "}
        {metric.better === "up" ? "Higher is better." : "Lower is better."}
      </div>

      {showTable ? (
        <div className="card table-wrap">
          <table className="data">
            <caption className="sr-only">
              {metric.label} at every tested setting value
            </caption>
            <thead>
              <tr>
                <th scope="col">Setting</th>
                <th scope="col">Value</th>
                {TABLE_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    style={
                      c.key === metricKey
                        ? { color: "var(--series-1)" }
                        : undefined
                    }
                  >
                    {c.label}
                    {c.key === metricKey ? " ●" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXPERIMENTS.flatMap((exp) =>
                rowsFor(summary, exp.key).map((r) => (
                  <tr key={`${exp.key}-${r[exp.key]}`}>
                    <td>{exp.label}</td>
                    <td>{formatSetting(exp.key, r[exp.key])}</td>
                    {TABLE_COLUMNS.map((c) => {
                      const value = r[c.key];
                      return (
                        <td
                          key={c.key}
                          style={
                            c.key === metricKey
                              ? {
                                  color: "var(--text-primary)",
                                  fontWeight: 640,
                                }
                              : undefined
                          }
                        >
                          {value !== null && value !== undefined
                            ? metricDef(c.key).format(value as number)
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-grid">
          {charts.map(({ exp, points }) => (
            <EffectChart
              key={exp.key}
              title={exp.label}
              subtitle={exp.blurb}
              axisLabel={exp.label}
              points={points}
              metric={metric}
              color={SERIES_COLOR[exp.key]}
              gradientId={`fill-${exp.key}`}
            />
          ))}
        </div>
      )}

      {strongest && weakest && strongest.exp.key !== weakest.exp.key && (
        <div className="callout">
          Across the values tested, <b>{metric.label.toLowerCase()}</b> swings
          most under <b>{strongest.exp.label}</b> (
          {metric.format(strongest.move!.delta)} between its highest and lowest
          point) and least under <b>{weakest.exp.label}</b> (
          {metric.format(weakest.move!.delta)}). A large swing can still come
          from a single extreme value rather than a steady trend — check the
          shape of the line, not only the size of the gap.
        </div>
      )}
    </section>
  );
}
