import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, Phone, MessageCircle, User, ExternalLink } from "lucide-react";
import { Card, Button, Input } from "@/components/ui";
import { useCreateParentContact } from "@/hooks/attendance/useParentContacts";
import { api } from "@/lib/axios";

interface Props {
  studentId: string;
  studentName: string;
  alertId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const METHODS = [
  { value: "PHONE", label: "Appel téléphonique", icon: Phone },
  { value: "SMS", label: "SMS", icon: MessageCircle },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "MEETING", label: "Rencontre", icon: User },
];

const RESULTS = [
  { value: "REACHED", label: "Contact établi" },
  { value: "NO_ANSWER", label: "Sans réponse" },
  { value: "UNREACHABLE", label: "Injoignable" },
  { value: "APPOINTMENT", label: "Rendez-vous fixé" },
  { value: "RESOLVED", label: "Situation résolue" },
];

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  relationType: string;
  isPrimary: boolean;
}

export function ParentContactModal({ studentId, studentName, alertId, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState("PHONE");
  const [result, setResult] = useState("REACHED");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>("");
  const createMut = useCreateParentContact();

  // Charger les guardians de l'élève
  const { data: guardians = [], isLoading: guardiansLoading } = useQuery<Guardian[]>({
    queryKey: ["student-guardians", studentId],
    queryFn: async () => {
      const { data } = await api.get(`/students/${studentId}`);
      const student = data?.data || data;
      return (student?.guardians || []).map((sg: any) => ({
        id: sg.guardian.id,
        firstName: sg.guardian.firstName,
        lastName: sg.guardian.lastName,
        phone: sg.guardian.phone,
        relationType: sg.guardian.relationType,
        isPrimary: sg.isPrimary,
      }));
    },
    enabled: !!studentId,
  });

  // Sélectionner le guardian principal par défaut
  const primaryGuardian = guardians.find((g) => g.isPrimary) || guardians[0];
  const selectedGuardian = guardians.find((g) => g.id === selectedGuardianId) || primaryGuardian;

  const handleWhatsApp = () => {
    if (!selectedGuardian?.phone) return;
    // Nettoyer le numéro (retirer espaces, tirets, +)
    const cleanPhone = selectedGuardian.phone.replace(/[\s\-+()]/g, "");
    const message = encodeURIComponent(
      `Bonjour, nous vous contactons concernant l'assiduité de votre enfant ${studentName}.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
    // Pré-sélectionner WHATSAPP automatiquement
    setMethod("WHATSAPP");
  };

  const handleSubmit = async () => {
    await createMut.mutateAsync({
      studentId,
      guardianId: selectedGuardian?.id,
      alertId,
      method,
      result,
      notes: notes.trim() || undefined,
      nextAction: nextAction.trim() || undefined,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-white p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Contacter le parent</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Élève : <strong>{studentName}</strong>
        </p>

        {/* Guardians */}
        {guardiansLoading ? (
          <div className="text-sm text-slate-400">Chargement des contacts...</div>
        ) : guardians.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            ⚠️ Aucun parent/tuteur enregistré pour cet élève. Ajoutez un tuteur dans la fiche élève.
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Parent / Tuteur</label>
            <select
              value={selectedGuardian?.id ?? ""}
              onChange={(e) => setSelectedGuardianId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {guardians.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.lastName} {g.firstName} ({g.relationType}) · {g.phone}
                  {g.isPrimary ? " ★" : ""}
                </option>
              ))}
            </select>
            {selectedGuardian && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                <Phone className="h-4 w-4 text-slate-500" />
                <span className="font-mono">{selectedGuardian.phone}</span>
                {selectedGuardian.phone && (
                  <button
                    onClick={handleWhatsApp}
                    className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    title="Ouvrir WhatsApp avec ce numéro"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Moyen de contact</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Résultat *</label>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {RESULTS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes (optionnel)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explication du parent, engagement..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Prochaine action (optionnel)</label>
          <Input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Ex: Rappeler dans 2 jours"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMut.isPending || guardians.length === 0}
          >
            {createMut.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
            ) : (
              "Enregistrer le contact"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}