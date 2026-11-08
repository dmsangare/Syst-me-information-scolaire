import { useState } from "react";
import { X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, Button, Input } from "@/components/ui";
import { useJustifyAbsence } from "@/hooks/attendance/useDailyAttendance";

interface Props {
  recordId: string;
  studentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function JustifyAbsenceModal({ recordId, studentName, onClose, onSuccess }: Props) {
  const [decision, setDecision] = useState<"ACCEPTED" | "REJECTED">("ACCEPTED");
  const [reason, setReason] = useState("");
  const [observation, setObservation] = useState("");
  const justifyMut = useJustifyAbsence();

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await justifyMut.mutateAsync({
      recordId,
      dto: { decision, reason: reason.trim(), observation: observation.trim() || undefined },
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Justifier une absence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Élève : <strong>{studentName}</strong>
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Décision</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDecision("ACCEPTED")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                decision === "ACCEPTED"
                  ? "bg-emerald-500 text-white border-transparent"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" /> Acceptée
            </button>
            <button
              onClick={() => setDecision("REJECTED")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                decision === "REJECTED"
                  ? "bg-red-500 text-white border-transparent"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <XCircle className="h-4 w-4" /> Refusée
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Motif *</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : Maladie, raison familiale..."
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Observation (optionnel)</label>
          <Input
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Commentaire administratif..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={justifyMut.isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={justifyMut.isPending || !reason.trim()}>
            {justifyMut.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
            ) : (
              "Enregistrer la justification"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
