"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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
  gradientId: string;
};

function Dot(props: { cx?: number; cy?: number; stroke?: string }) {
  const { cx, cy, stroke } = props;
  if (cx === undefined || cy === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--surface)"
      stroke={stroke}
      strokeWidth={2.5}
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
        <span
          style={{
            color: "var(--text-muted)",
            fontWeight: 400,
            fontSize: 12,
          }}
        >
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
  gradientId,
}: Props) {
  const values = points
    .map((p) => p.y)
    .filter((v): v is number => v !== null && v !== undefined);

  const domain: [number, number] = metric.domain
    ? metric.domain
    : [Math.min(...values) * 0.9, Math.max(...values) * 1.1 || 1];

  const first = values[0];
  const last = values[values.length - 1];
  const change = first !== undefined && last !== undefined ? last - first : 0;
  const trend = change === 0 ? "flat" : change > 0 ? "↑ rises" : "↓ falls";

  return (
    <div className="card chart-card">
      <div className="chart-head">
        <span className="chart-swatch" style={{ background: color }} />
        <span className="chart-title">{title}</span>
      </div>
      <div className="chart-sub">{subtitle}</div>

      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 18, bottom: 4, left: -10 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 11.5 }}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              dy={2}
            />
            <YAxis
              domain={domain}
              tick={{ fill: "var(--text-muted)", fontSize: 11.5 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => metric.format(v)}
            />
            <Tooltip
              cursor={{ stroke: "var(--axis)", strokeDasharray: "4 4" }}
              content={<ChartTooltip metric={metric} axisLabel={axisLabel} />}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke="none"
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2.25}
              dot={<Dot />}
              activeDot={{
                r: 6,
                strokeWidth: 2.5,
                stroke: "var(--surface)",
                fill: color,
              }}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-readout">
        <span>
          {points[0]?.label} →{" "}
          <b>{first !== undefined ? metric.format(first) : "—"}</b>
        </span>
        <span className="trend">{trend}</span>
        <span>
          {points[points.length - 1]?.label} →{" "}
          <b>{last !== undefined ? metric.format(last) : "—"}</b>
        </span>
      </div>
    </div>
  );
}
