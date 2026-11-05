import { useState, useMemo } from "react";
import {
  Plus,
  Loader2,
  Download,
  RotateCcw,
  Trash2,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  HardDrive,
  Database,
  FileArchive,
  FileText,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";
import {
  useBackups,
  useBackupSettings,
  useCreateBackup,
  useDeleteBackup,
  useRestoreBackup,
  useUpdateBackupSettings,
  useDownloadBackup,
} from "@/hooks/backups";
import { formatDateTime, formatFileSize } from "@/lib/formatters";
import { toast } from "sonner";
import type { Backup, BackupSettings } from "@/api/backups";

// ============================================================
// CONSTANTES
// ============================================================

const TYPE_LABELS: Record<string, string> = {
  DB: "Base de données",
  FILES: "Fichiers",
  FULL: "Complet (DB + Fichiers)",
};

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-500/10 text-red-700 border-red-200",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Succès",
  FAILED: "Échec",
  IN_PROGRESS: "En cours",
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function BackupsTab() {
  const [showConfigure, setShowConfigure] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<Backup | null>(null);

  const { data: listData, isLoading } = useBackups({ limit: 20 });
  const { data: settings, isLoading: settingsLoading } = useBackupSettings();
  const createMutation = useCreateBackup();
  const deleteMutation = useDeleteBackup();

  const backups = listData?.data || [];

  const handleCreate = () => {
    createMutation.mutate();
  };

  const handleDelete = (backup: Backup) => {
    if (
      window.confirm(
        `Supprimer la sauvegarde du ${formatDateTime(backup.createdAt)} ?\n\nCette action est irréversible.`,
      )
    ) {
      deleteMutation.mutate(backup.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Sauvegardes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {backups.length} sauvegarde(s) — Créez et restaurez vos données
          </p>
        </div>
        <Button onClick={handleCreate} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Créer maintenant
        </Button>
      </div>

      {/* Carte Config Auto */}
      {settingsLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : settings ? (
        <AutoBackupCard
          settings={settings}
          onConfigure={() => setShowConfigure(true)}
        />
      ) : null}

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col h-64 items-center justify-center gap-3">
              <HardDrive className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aucune sauvegarde</p>
              <Button variant="outline" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Créer la première
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs font-medium text-muted-foreground uppercase">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Taille</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <BackupRow
                      key={backup.id}
                      backup={backup}
                      onRestore={() => setRestoreBackup(backup)}
                      onDelete={() => handleDelete(backup)}
                      deleting={
                        deleteMutation.isPending &&
                        deleteMutation.variables === backup.id
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      {showConfigure && settings && (
        <ConfigureAutoModal
          settings={settings}
          onClose={() => setShowConfigure(false)}
        />
      )}

      {restoreBackup && (
        <RestoreModal
          backup={restoreBackup}
          onClose={() => setRestoreBackup(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// CARTE CONFIG AUTO
// ============================================================

function AutoBackupCard({
  settings,
  onConfigure,
}: {
  settings: BackupSettings;
  onConfigure: () => void;
}) {
  const nextRun = useMemo(() => {
    if (!settings.nextRun) return null;
    return formatDateTime(settings.nextRun);
  }, [settings.nextRun]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sauvegarde automatique
          </CardTitle>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              settings.enabled
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {settings.enabled ? "â— Activée" : "â—‹ Désactivée"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Heure" value={formatCronTime(settings.cron)} />
          <InfoItem
            label="Rétention"
            value={`${settings.retention.daily}j / ${settings.retention.weekly}s / ${settings.retention.monthly}m`}
          />
          <InfoItem
            label="Dernière"
            value={
              settings.lastRun
                ? formatDateTime(settings.lastRun)
                : "Jamais"
            }
          />
          <InfoItem label="Prochaine" value={nextRun || "—"} />
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onConfigure}>
            <SettingsIcon className="h-4 w-4" />
            Configurer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

// ============================================================
// LIGNE DU TABLEAU
// ============================================================

function BackupRow({
  backup,
  onRestore,
  onDelete,
  deleting,
}: {
  backup: Backup;
  onRestore: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const downloadMutation = useDownloadBackup();

  const handleDownload = async (part: "db" | "files" | "checksum") => {
    try {
      const blob = await downloadMutation.mutateAsync({
        id: backup.id,
        part,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const timestamp = backup.fileUrl.split("/").pop() || backup.id;
      const ext = part === "db" ? "sql.gz" : part === "files" ? "tar.gz" : "sha256";
      const prefix = part === "db" ? "DB" : part === "files" ? "FILES" : "";
      a.download = prefix
        ? `backup-${timestamp}-${prefix}.${ext}`
        : `backup-${timestamp}.${ext}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Error déjÃ  gérée par le hook
    }
  };

  const isSuccess = backup.status === "SUCCESS";

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="px-4 py-3 text-sm">
        {formatDateTime(backup.createdAt)}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
          {TYPE_LABELS[backup.type] || backup.type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatFileSize(backup.sizeBytes)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
            STATUS_STYLES[backup.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {backup.status === "SUCCESS" && <CheckCircle2 className="h-3 w-3" />}
          {backup.status === "FAILED" && <XCircle className="h-3 w-3" />}
          {backup.status === "IN_PROGRESS" && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {STATUS_LABELS[backup.status] || backup.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {/* Télécharger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!isSuccess || downloadMutation.isPending}
                title="Télécharger"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload("db")}>
                <Database className="h-4 w-4 mr-2" />
                Base de données (.sql.gz)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("files")}>
                <FileArchive className="h-4 w-4 mr-2" />
                Fichiers (.tar.gz)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("checksum")}>
                <FileText className="h-4 w-4 mr-2" />
                Checksum (.sha256)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Restaurer */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRestore}
            disabled={!isSuccess}
            title="Restaurer"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Supprimer */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={deleting}
            title="Supprimer"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// MODALE CONFIGURER
// ============================================================

function ConfigureAutoModal({
  settings,
  onClose,
}: {
  settings: BackupSettings;
  onClose: () => void;
}) {
  const updateMutation = useUpdateBackupSettings();

  const [enabled, setEnabled] = useState(settings.enabled);
  const [hour, setHour] = useState(parseCronHour(settings.cron));
  const [daily, setDaily] = useState(settings.retention.daily);
  const [weekly, setWeekly] = useState(settings.retention.weekly);
  const [monthly, setMonthly] = useState(settings.retention.monthly);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        enabled,
        cron: `0 ${hour} * * *`,
        retention: { daily, weekly, monthly },
      });
      onClose();
    } catch {
      // Error gérée par le hook
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Configurer la sauvegarde automatique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">Activer la sauvegarde auto</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Une sauvegarde sera créée automatiquement chaque jour
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 cursor-pointer"
            />
          </label>

          {/* Heure */}
          <div className="space-y-2">
            <Label htmlFor="hour">Heure quotidienne</Label>
            <select
              id="hour"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled={!enabled}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Choisissez une heure creuse (nuit) pour éviter de ralentir l&apos;application.
            </p>
          </div>

          {/* Rétention */}
          <div className="space-y-2">
            <Label>Rétention</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Quotidiens
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={daily}
                  onChange={(e) => setDaily(Number(e.target.value))}
                  disabled={!enabled}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Hebdomadaires
                </label>
                <Input
                  type="number"
                  min={0}
                  max={52}
                  value={weekly}
                  onChange={(e) => setWeekly(Number(e.target.value))}
                  disabled={!enabled}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Mensuels
                </label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={monthly}
                  onChange={(e) => setMonthly(Number(e.target.value))}
                  disabled={!enabled}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Les sauvegardes plus anciennes seront supprimées automatiquement.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// MODALE RESTAURER
// ============================================================

function RestoreModal({
  backup,
  onClose,
}: {
  backup: Backup;
  onClose: () => void;
}) {
  const restoreMutation = useRestoreBackup();
  const [confirmText, setConfirmText] = useState("");
  const [createSafety, setCreateSafety] = useState(true);

  const canRestore = confirmText === "RESTAURER";

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync({
        id: backup.id,
        confirmation: confirmText,
        createSafetyBackup: createSafety,
      });

      toast.success("Restauration réussie", {
        description: "La base de données a été restaurée avec succès.",
      });
      onClose();
      // Recharger la page pour repartir sur des données fraîches
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      // Error gérée par le hook
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Restauration destructive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-destructive">
              âš ï¸ Cette opération remplacera TOUTES les données actuelles
            </p>
            <p className="text-xs text-destructive/80">
              Toutes les modifications effectuées après cette sauvegarde seront
              <strong> définitivement perdues</strong>. Cette action est
              irréversible.
            </p>
          </div>

          {/* Détails du backup */}
          <div className="space-y-2 bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Sauvegarde Ã  restaurer</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Date</p>
                <p className="font-medium">{formatDateTime(backup.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Taille</p>
                <p className="font-medium">{formatFileSize(backup.sizeBytes)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Type</p>
                <p className="font-medium">{TYPE_LABELS[backup.type]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Statut</p>
                <p className="font-medium text-emerald-600">Vérifié âœ…</p>
              </div>
            </div>
          </div>

          {/* Safety backup */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createSafety}
              onChange={(e) => setCreateSafety(e.target.checked)}
              className="mt-1 w-4 h-4 cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium">
                Créer un backup de sécurité avant
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Un backup de l&apos;état actuel sera créé en premier. Recommandé
                pour pouvoir revenir en arrière en cas de problème.
              </p>
            </div>
          </label>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Saisissez <strong className="font-mono">RESTAURER</strong> pour confirmer
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESTAURER"
              className="font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={handleRestore}
              disabled={!canRestore || restoreMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {restoreMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Restaurer maintenant
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function parseCronHour(cron: string): number {
  const parts = cron.split(" ");
  if (parts.length < 2) return 23;
  const hour = Number(parts[1]);
  return isNaN(hour) ? 23 : hour;
}

function formatCronTime(cron: string): string {
  const hour = parseCronHour(cron);
  return `${String(hour).padStart(2, "0")}:00`;
}
