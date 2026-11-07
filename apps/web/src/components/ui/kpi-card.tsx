import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  accent?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

const accentStyles: Record<NonNullable<KpiCardProps["accent"]>, { bg: string; text: string }> = {
  brand:   { bg: "bg-blue-50",   text: "text-blue-600" },
  info:    { bg: "bg-cyan-50",   text: "text-cyan-600" },
  success: { bg: "bg-emerald-50", text: "text-emerald-600" },
  warning: { bg: "bg-amber-50",   text: "text-amber-600" },
  danger:  { bg: "bg-red-50",     text: "text-red-600" },
  neutral: { bg: "bg-slate-100",  text: "text-slate-600" },
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  trend,
  accent = "brand",
  className,
}: KpiCardProps) {
  const styles = accentStyles[accent];

  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", styles.bg, styles.text)}>
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
        </div>

        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", trend.direction === "up" ? "bg-emerald-50 text-emerald-600" : trend.direction === "down" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500")}>
            {trend.direction === "up" && <ArrowUpRight className="h-3 w-3" />}
            {trend.direction === "down" && <ArrowDownRight className="h-3 w-3" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      {hint && <p className="mt-3 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}