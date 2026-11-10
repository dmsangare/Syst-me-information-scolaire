import { useState } from "react";
import { Plus, Calendar, ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, PageLoader, EmptyState } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaigns, useActivateCampaign, useValidateCampaign } from "@/hooks/campaigns";
import { CreateCampaignModal } from "./components/CreateCampaignModal";
import type { CampaignStatus } from "@/types/campaign";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, TERM_TYPE_LABELS } from "@/types/campaign";

const STATUS_ICONS: Record<CampaignStatus, any> = {
  BROUILLON: AlertCircle,
  ACTIVE: Calendar,
  SAISIE_EN_COURS: ClipboardList,
  VALIDE_DIRECTEUR: CheckCircle2,
};

export function CampaignsListPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("assessment:create");
  const canUpdate = hasPermission("assessment:update");
  const canValidate = hasPermission("assessment:validate");

  const [modalOpen, setModalOpen] = useState(false);
  const { data: campaigns, isLoading } = useCampaigns();
  const activateMutation = useActivateCampaign();
  const validateMutation = useValidateCampaign();

  const handleActivate = async (id: string) => {
    if (!confirm("Activer cette campagne ? Les enseignants pourront saisir les notes.")) return;
    try {
      await activateMutation.mutateAsync(id);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Erreur lors de l'activation");
    }
  };

  const handleValidate = async (id: string) => {
    if (!confirm("Valider cette campagne ? Tous les enseignants doivent avoir valide leurs notes.")) return;
    try {
      await validateMutation.mutateAsync(id);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Erreur lors de la validation");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-sis-md bg-sis-brand-50 text-sis-brand mt-0.5 dark:bg-sis-brand-900/30 dark:text-sis-brand-300">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campagnes de compositions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gelez les campagnes mensuelles (1er cycle) et trimestrielles (2e cycle).
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle campagne
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageLoader label="Chargement des campagnes..." />
      ) : !campaigns || campaigns.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="Aucune campagne"
          description="Creez votre premiere campagne pour commencer."
          action={
            canCreate ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle campagne
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => {
            const StatusIcon = STATUS_ICONS[c.status];
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-sis-md border border-sis-neutral-200 bg-card p-4 dark:border-sis-neutral-700"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sis-brand-50 text-sis-brand dark:bg-sis-brand-900/30">
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {c.term.name} - {c.class.name}
                      </h3>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${CAMPAIGN_STATUS_COLORS[c.status]}`}>
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.term.academicYear.label} - {TERM_TYPE_LABELS[c.term.type]} - {c.class.level.name}
                      {c._stats && (
                        <> - {c._stats.assessmentsCount} evaluation(s) - {c._stats.teacherValidations.validated}/{c._stats.teacherValidations.total} validee(s)</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === "BROUILLON" && canUpdate && (
                    <Button size="sm" variant="outline" onClick={() => handleActivate(c.id)}>
                      Activer
                    </Button>
                  )}
                  {c.status === "ACTIVE" && canValidate && (
                    <Button size="sm" variant="outline" onClick={() => handleValidate(c.id)}>
                      Valider
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <CreateCampaignModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}