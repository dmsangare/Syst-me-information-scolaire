import { Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatrixActionBarProps {
  filledCells: number;
  totalCells: number;
  isSaving: boolean;
  hasChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function MatrixActionBar({
  filledCells,
  totalCells,
  isSaving,
  hasChanges,
  onSave,
  onCancel,
}: MatrixActionBarProps) {
  const percent = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl">
      <div className="rounded-xl bg-white shadow-2xl border border-gray-200 px-4 py-3 flex items-center gap-4">
        {/* Compteur + progression */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-700">
              {filledCells} / {totalCells} notes saisies
            </p>
            <p className="text-xs font-semibold text-gray-900">{percent}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                percent === 100 ? "bg-emerald-500" : percent > 0 ? "bg-blue-500" : "bg-gray-300",
              )}
              style={{ width: percent + "%" }}
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving || !hasChanges}
          >
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
