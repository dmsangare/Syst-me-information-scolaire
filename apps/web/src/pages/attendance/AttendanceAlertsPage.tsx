import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, Phone, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, PageLoader, EmptyState, Button } from "@/components/ui";
import { useState } from "react";
import { ParentContactModal } from "./components/ParentContactModal";
import { AlertDetailsDrawer } from "./components/AlertDetailsDrawer";
import {
  useAttendanceAlerts,
  useUpdateAlertStatus,
  useDetectAlerts,
} from "@/hooks/attendance/useAttendanceAlerts";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: "Nouvelle", color: "bg-red-50 text-red-700 border-red-200" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PARENT_CONTACTED: { label: "Parent contacté", color: "bg-amber-50 text-amber-700 border-amber-200" },
  RESOLVED: { label: "Résolue", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DISMISSED: { label: "Classée", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

export function AttendanceAlertsPage() {
  const { data: alerts, isLoading } = useAttendanceAlerts();
  const updateMut = useUpdateAlertStatus();
  const detectMut = useDetectAlerts();
  const [contactModal, setContactModal] = useState<{
    studentId: string;
    studentName: string;
    alertId: string;
  } | null>(null);
  const [detailsAlertId, setDetailsAlertId] = useState<string | null>(null);

  if (isLoading) return <PageLoader label="Chargement des alertes..." />;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/attendance" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Alertes d'assiduité</h1>
            <p className="text-sm text-muted-foreground">
              {alerts?.length ?? 0} alerte(s) · Détection 2 jours consécutifs
            </p>
          </div>
        </div>
        <Button onClick={() => detectMut.mutate()} disabled={detectMut.isPending}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Lancer la détection
        </Button>
      </div>

      {!alerts || alerts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              title="Aucune alerte"
              description="Aucun élève en situation d'absence répétée."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Liste des alertes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {alerts.map((a: any) => {
                const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.NEW;
                return (
                  <div key={a.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-800">
                            {a.student?.lastName} {a.student?.firstName}
                          </p>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {a.student?.matricule} · {a.reason}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailsAlertId(a.id)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Détails
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setContactModal({
                              studentId: a.student.id,
                              studentName: `${a.student.lastName} ${a.student.firstName}`,
                              alertId: a.id,
                            })
                          }
                        >
                          <Phone className="h-3.5 w-3.5 mr-1" />
                          Contacter parent
                        </Button>
                        {a.status === "NEW" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMut.mutate({ id: a.id, dto: { status: "IN_PROGRESS" } })}
                          >
                            Traiter
                          </Button>
                        )}
                        {(a.status === "NEW" || a.status === "IN_PROGRESS" || a.status === "PARENT_CONTACTED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMut.mutate({ id: a.id, dto: { status: "RESOLVED" } })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Résoudre
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {contactModal && (
        <ParentContactModal
          studentId={contactModal.studentId}
          studentName={contactModal.studentName}
          alertId={contactModal.alertId}
          onClose={() => setContactModal(null)}
          onSuccess={() => setContactModal(null)}
        />
      )}

      {detailsAlertId && (
        <AlertDetailsDrawer
          alertId={detailsAlertId}
          onClose={() => setDetailsAlertId(null)}
        />
      )}
    </div>
  );
}