import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

type Decision = "ADMIS" | "REDOUBLE" | "A_EXAMINER" | "INCOMPLET";

interface Props {
  decision: Decision;
  annualAverage: number | null;
  passingScore: number;
  scale: number;
}

const CONFIG: Record<Decision, { label: string; icon: any; classes: string }> = {
  ADMIS: {
    label: "Admis",
    icon: CheckCircle2,
    classes: "bg-sis-success-bg text-sis-success border-sis-success-border",
  },
  REDOUBLE: {
    label: "Redouble",
    icon: XCircle,
    classes: "bg-sis-danger-bg text-sis-danger border-sis-danger-border",
  },
  A_EXAMINER: {
    label: "À examiner",
    icon: AlertCircle,
    classes: "bg-sis-warning-bg text-sis-warning border-sis-warning-border",
  },
  INCOMPLET: {
    label: "Incomplet",
    icon: HelpCircle,
    classes: "bg-sis-neutral-100 text-sis-neutral-700 border-sis-neutral-200",
  },
};

export function SuggestionBadge({ decision, annualAverage, passingScore, scale }: Props) {
  const cfg = CONFIG[decision] || CONFIG.INCOMPLET;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          cfg.classes,
        )}
      >
        <Icon className="h-3 w-3" />
        {cfg.label}
      </span>
      {annualAverage !== null && (
        <span className="text-xs text-muted-foreground font-mono">
          {annualAverage.toFixed(2)}/{scale} (seuil {passingScore}/{scale})
        </span>
      )}
    </div>
  );
}