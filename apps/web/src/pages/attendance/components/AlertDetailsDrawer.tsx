import { X, Phone, MessageCircle, User, Calendar, AlertCircle } from "lucide-react";
import { Card, Button, PageLoader } from "@/components/ui";
import { useAlertDetails } from "@/hooks/attendance/useAttendanceAlerts";
import { Link } from "react-router-dom";

interface Props {
  alertId: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Nouvelle", color: "bg-red-50 text-red-700" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-50 text-blue-700" },
  PARENT_CONTACTED: { label: "Parent contacté", color: "bg-amber-50 text-amber-700" },
  RESOLVED: { label: "Résolue", color: "bg-emerald-50 text-emerald-700" },
  DISMISSED: { label: "Classée", color: "bg-slate-50 text-slate-700" },
};

const METHOD_LABELS: Record<string, string> = {
  PHONE: "Appel téléphonique",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Rencontre",
  OTHER: "Autre",
};

const RESULT_LABELS: Record<string, string> = {
  REACHED: "Contact établi",
  NO_ANSWER: "Sans réponse",
  UNREACHABLE: "Injoignable",
  APPOINTMENT: "Rendez-vous fixé",
  RESOLVED: "Situation résolue",
};

export function AlertDetailsDrawer({ alertId, onClose }: Props) {
  const { data, isLoading } = useAlertDetails(alertId);

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-lg">Détails de l'alerte</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><PageLoader label="Chargement..." /></div>
        ) : !data ? (
          <div className="p-6 text-center text-slate-500">Alerte introuvable</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Élève */}
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-lg">
                    {data.student.lastName} {data.student.firstName}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{data.student.matricule}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[data.alert.status]?.color}`}>
                  {STATUS_LABELS[data.alert.status]?.label ?? data.alert.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {data.alert.reason}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Détectée le {new Date(data.alert.detectedAt).toLocaleDateString("fr-FR")}
              </p>
            </Card>

            {/* Absences récentes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Absences récentes ({data.absences.length})
              </h3>
              <div className="space-y-1">
                {data.absences.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                    <span>{new Date(a.date).toLocaleDateString("fr-FR")}</span>
                    <span className={
                      a.status === "ABSENT_JUSTIFIED" ? "text-emerald-600" :
                      a.status === "ABSENT_UNJUSTIFIED" ? "text-red-600" :
                      "text-amber-600"
                    }>
                      {a.status.replace("ABSENT_", "").replace("ABSENT", "Non justifiée") || "Absent"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Historique des contacts */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Historique des contacts ({data.contacts.length})
              </h3>
              {data.contacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  Aucun contact enregistré
                </div>
              ) : (
                <div className="space-y-2">
                  {data.contacts.map((c: any) => (
                    <div key={c.id} className="p-3 border border-slate-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {METHOD_LABELS[c.method] ?? c.method}
                        </span>
                        <span className="text-slate-500">
                          {new Date(c.contactDate).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>{c.guardian?.firstName} {c.guardian?.lastName}</strong> ({c.guardian?.phone})
                      </p>
                      <p className="text-xs">
                        <span className="font-medium text-slate-700">Résultat : </span>
                        {RESULT_LABELS[c.result] ?? c.result}
                      </p>
                      {c.notes && (
                        <p className="text-xs text-slate-500 italic">"{c.notes}"</p>
                      )}
                      {c.nextAction && (
                        <p className="text-xs text-blue-600">
                          → {c.nextAction}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        Par {c.contactedBy?.firstName} {c.contactedBy?.lastName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Link to={`/attendance/student/${data.student.id}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  Voir la fiche assiduité
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}