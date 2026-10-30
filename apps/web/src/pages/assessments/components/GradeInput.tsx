import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface GradeInputProps {
  value: string;
  maxScore: number;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  "data-row"?: number;
  "data-col"?: number;
}

export const GradeInput = forwardRef<HTMLInputElement, GradeInputProps>(
  (
    { value, maxScore, disabled, onChange, onKeyDown, onBlur, ...rest },
    ref,
  ) => {
    const numValue = parseFloat(value);
    const isInvalid =
      value !== "" && (isNaN(numValue) || numValue < 0 || numValue > maxScore);

    const errorId = `grade-error-${rest["data-row"] ?? "0"}`;

    return (
      <div className="relative flex flex-col w-full">
        <div className="relative">
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
              onChange(cleaned);
            }}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            disabled={disabled}
            placeholder="—"
            // ✅ Accessibilité
            aria-label={`Note sur ${maxScore}`}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? errorId : undefined}
            className={cn(
              "w-full h-10 px-2 text-center text-sm font-mono rounded-md border transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              isInvalid
                ? "border-destructive bg-destructive/5 text-destructive pr-7"
                : "border-input bg-background",
              disabled && "opacity-60 cursor-not-allowed bg-muted",
            )}
            {...rest}
          />
          {/* ✅ Icône d'alerte visible (pas seulement la couleur) */}
          {isInvalid && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-destructive pointer-events-none">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* ✅ Message d'erreur explicite */}
        {isInvalid && (
          <span
            id={errorId}
            className="text-[10px] text-destructive mt-0.5 leading-tight text-center"
            role="alert"
          >
            {numValue < 0
              ? "Note négative"
              : numValue > maxScore
                ? `Max ${maxScore}`
                : "Invalide"}
          </span>
        )}
      </div>
    );
  },
);
GradeInput.displayName = "GradeInput";