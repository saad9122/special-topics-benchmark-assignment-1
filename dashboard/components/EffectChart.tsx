"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricDef } from "@/lib/metrics";

export type Point = { x: number; y: number | null; label: string };

type Props = {
  title: string;
  subtitle: string;
  axisLabel: string;
  points: Point[];
  metric: MetricDef;
  color: string;
};

function Dot(props: {
  cx?: number;
  cy?: number;
  payload?: Point;
  stroke?: string;
}) {
  const { cx, cy, stroke } = props;
  if (cx === undefined || cy === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill={stroke}
      stroke="var(--surface)"
      strokeWidth={2}
    />
  );
}

function ChartTooltip({
  active,
  payload,
  metric,
  axisLabel,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  metric: MetricDef;
  axisLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (point.y === null) return null;

  return (
    <div className="tooltip">
      <div className="tooltip-key">
        {axisLabel} = {point.label}
      </div>
      <div className="tooltip-value">
        {metric.format(point.y)}{" "}
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
          {metric.unit}
        </span>
      </div>
    </div>
  );
}

export default function EffectChart({
  title,
  subtitle,
  axisLabel,
  points,
  metric,
  color,
}: Props) {
  const values = points
    .map((p) => p.y)
    .filter((v): v is number => v !== null && v !== undefined);

  const domain: [number, number] = metric.domain
    ? metric.domain
    : [
        Math.min(...values) * 0.9,
        Math.max(...values) * 1.1 || 1,
      ];

  const first = values[0];
  const last = values[values.length - 1];
  const change = first !== undefined && last !== undefined ? last - first : 0;
  const direction = change === 0 ? "flat" : change > 0 ? "rises" : "falls";

  return (
    <div className="card chart-card">
      <div className="chart-title">{title}</div>
      <div className="chart-sub">{subtitle}</div>

      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 8, right: 18, bottom: 4, left: -8 }}
          >
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
            />
            <YAxis
              domain={domain}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(v: number) => metric.format(v)}
            />
            <Tooltip
              cursor={{ stroke: "var(--axis)", strokeDasharray: "3 3" }}
              content={
                <ChartTooltip metric={metric} axisLabel={axisLabel} />
              }
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2}
              dot={<Dot />}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--surface)" }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-readout">
        <span>
          {points[0]?.label} → <b>{first !== undefined ? metric.format(first) : "—"}</b>
        </span>
        <span style={{ color: "var(--text-muted)" }}>{direction}</span>
        <span>
          {points[points.length - 1]?.label} →{" "}
          <b>{last !== undefined ? metric.format(last) : "—"}</b>
        </span>
      </div>
    </div>
  );
}
