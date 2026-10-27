"use client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { money } from "@/lib/formatters";
const colors = [
  "#0071e3",
  "#54a0f6",
  "#93c5fd",
  "#5e5ce6",
  "#8e8e93",
  "#30a46c",
  "#f5a524",
  "#db6273",
];
export function ReportChart({
  data,
  type = "bar",
}: {
  data: { name: string; value: number }[];
  type?: "bar" | "donut" | "trend";
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={data.map((d) => d.name + ": " + money(d.value)).join("; ")}
    >
      <ResponsiveContainer width="100%" height={230}>
        {type === "donut" ? (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={92}
              paddingAngle={3}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => money(v)} />
          </PieChart>
        ) : type === "trend" ? (
          <AreaChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => "₹" + v}
              width={60}
              tick={{ fontSize: 11 }}
            />
            <Tooltip formatter={(v) => money(v)} />
            <Area
              dataKey="value"
              stroke="#0071e3"
              fill="#0071e3"
              fillOpacity={0.09}
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis
              tickFormatter={(v) => "₹" + v}
              width={60}
              tick={{ fontSize: 11 }}
            />
            <Tooltip formatter={(v) => money(v)} />
            <Bar dataKey="value" fill="#0071e3" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
