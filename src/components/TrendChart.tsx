"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AttendancePoint } from "@/lib/types";

export default function TrendChart({ points, campus }: { points: AttendancePoint[]; campus: string }) {
  const rows = new Map<string, number>();
  for (const p of points) if (campus === "All" || p.campus === campus) rows.set(p.month, (rows.get(p.month) ?? 0) + p.attendance);
  const data = [...rows].sort(([a], [b]) => a.localeCompare(b)).map(([month, attendance]) => ({ month, attendance }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#eee8da" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#494744", fontSize: 12 }} />
        <YAxis tick={{ fill: "#494744", fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="attendance" stroke="#9C9067" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
