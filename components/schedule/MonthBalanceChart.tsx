"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useSchedule } from "@/hooks/useSchedule";
import { groupByMonth } from "@/lib/schedule";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

export function MonthBalanceChart() {
  const { diensten } = useSchedule();
  
  const data = useMemo(() => {
    const months = groupByMonth(diensten);
    
    // We only want the last 6-12 months.
    return months.slice(-12).map(m => {
      // Calculate how many expected hours there are in a month
      // roughly 4.33 weeks per month * 16 = 69.3 hours, but let's just use exact week calculations if we want.
      // Since it's month stats, we don't have week counts. Let's just do actual hours vs 69.3
      const expected = 69.3; 
      const delta = Math.round((m.totalHours - expected) * 10) / 10;
      
      return {
        name: m.label.split(" ")[0].substring(0,3) + " " + m.label.split(" ")[1].substring(2),
        hours: m.totalHours,
        delta: delta,
        color: delta > 0 ? "#f97316" : delta < 0 ? "#ef4444" : "#10b981"
      };
    });
  }, [diensten]);

  if (data.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-black/40 border border-white/5 p-5 shadow-xl backdrop-blur-xl mb-6 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-slate-300">Monthly Performance</h3>
          <p className="text-xs text-slate-500 mt-1">Total hours per month vs 69.3h expected</p>
        </div>
      </div>
      
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "#64748b" }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "#64748b" }} 
            />
            <Tooltip 
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-black/90 border border-slate-800 p-3 shadow-2xl">
                      <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">{d.name}</p>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 text-xs">Hours</span>
                        <span className="font-bold">{d.hours}h</span>
                      </div>
                      <div className="flex justify-between items-center gap-4 mt-1">
                        <span className="text-slate-500 text-xs">Delta</span>
                        <span className="font-bold" style={{ color: d.color }}>
                          {d.delta > 0 ? "+" : ""}{d.delta}h
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={69.3} stroke="#334155" strokeDasharray="3 3" />
            <Bar 
              dataKey="hours" 
              radius={[4, 4, 0, 0]}
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                return (
                  <rect x={x} y={y} width={width} height={height} fill={payload.color} rx={4} ry={4} opacity={0.8} />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
