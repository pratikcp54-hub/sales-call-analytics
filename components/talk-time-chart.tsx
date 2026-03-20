"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function TalkTimeChart({ agent, customer }: { agent: number; customer: number }) {
  const data = [
    { name: "Agent", value: agent },
    { name: "Customer", value: customer },
  ];

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
          >
            <Cell fill="#3b82f6" stroke="transparent" />
            <Cell fill="#a855f7" stroke="transparent" />
          </Pie>
          <Tooltip formatter={(v) => (typeof v === "number" ? `${v}%` : String(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
