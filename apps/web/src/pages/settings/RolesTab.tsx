import { useState, useMemo, useEffect } from "react";
import {
  Shield,
  Plus,
  Loader2,
  Save,
  Trash2,
  Lock,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  Crown,
  Briefcase,
  UserCog,
  GraduationCap,
  UserCheck,
  UserX,
  Wallet,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useRoles,
  usePermissions,
  useRole,
  useCreateRole,
  useUpdateRole,
  useSetPermissions,
  useDeleteRole,
} from "@/hooks/roles";
import type { Role, Permission, RoleDetail } from "@/api/roles";

// ============================================================
// Libelles francais pour les modules
// ============================================================
const MODULE_LABELS: Record<string, string> = {
  school: "Établissement",
  academic_year: "Annee scolaire",
  level: "Niveaux",
  class: "Classes",
  student: "Élèves",
  parent: "Parents",
  enrollment: "Inscriptions",
  teacher: "Enseignants",
  subject: "Matières",
  assignment: "Affectations",
  timetable: "Emploi du temps",
  attendance: "Présences",
  assessment: "Evaluations",
  grade: "Notes",
  report_card: "Bulletins",
  exam: "Examens",
  fee: "Frais",
  invoice: "Factures",
  payment: "Paiements",
  cash: "Caisse",
  document: "Documents",
  notification: "Notifications",
  report: "Rapports",
  user: "Utilisateurs",
  role: "Roles",
  audit: "Audit",
  backup: "Sauvegardes",
  settings: "Paramètres",
};

// Libelles francais pour les actions
const ACTION_LABELS: Record<string, string> = {
  view: "Voir",
  create: "Créer",
  update: "Modifier",
  delete: "Supprimer",
  validate: "Valider",
  export: "Exporter",
  print: "Imprimer",
  lock: "Verrouiller",
  close: "Cloturer",
  cancel: "Annuler",
  archive: "Archiver",
  restore: "Restaurer",
};

// ============================================================
// Icones par role (code systeme)
// ============================================================
const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SUPER_ADMIN: Crown,
  DIRECTOR: Briefcase,
  SECRETARY: UserCog,
  TEACHER: GraduationCap,
  ACCOUNTANT: Wallet,
  SUPERVISOR: UserCheck,
  PARENT: UsersIcon,
  STUDENT: GraduationCap,
};

const DEFAULT_ROLE_ICON = Shield;

// ============================================================
// Composant principal
// ============================================================
export function RolesTab() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState("");
  const [showOnlyChecked, setShowOnlyChecked] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(
    new Set(),
  );

  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: permissions, isLoading: permsLoading } = usePermissions();
  const { data: roleDetail, isLoading: detailLoading } = useRole(
    selectedRoleId,
  );

  const setPermissionsMutation = useSetPermissions();
  const deleteRoleMutation = useDeleteRole();

  // Auto-selectionner le premier role au chargement
  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  // Charger les permissions du role selectionne
  useEffect(() => {
    if (roleDetail) {
      setEditedPermissions(new Set(roleDetail.permissions));
      setHasChanges(false);
    }
  }, [roleDetail]);

  const togglePermission = (permId: string) => {
    setEditedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setHasChanges(true);
  };

  const toggleModule = (moduleKey: string, checked: boolean) => {
    const modulePerms = permissions?.modules[moduleKey] || [];
    setEditedPermissions((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      });
      return next;
    });
    setHasChanges(true);
  };

  const toggleModuleCollapse = (moduleKey: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    await setPermissionsMutation.mutateAsync({
      id: selectedRoleId,
      permissionIds: Array.from(editedPermissions),
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    if (!roleDetail) return;
    setEditedPermissions(new Set(roleDetail.permissions));
    setHasChanges(false);
  };

  const handleDelete = async () => {
    if (!roleDetail || roleDetail.isSystem) return;
    if (
      !confirm(
        `Supprimer le role "${roleDetail.name}" ? Cette action est irreversible.`,
      )
    )
      return;
    await deleteRoleMutation.mutateAsync(roleDetail.id);
    setSelectedRoleId(null);
  };

  // Trier les modules avec recherche + filtre
  const sortedModules = useMemo(() => {
    if (!permissions) return [];
    let modules = Object.keys(permissions.modules);

    // Filtrer par recherche
    if (search.trim()) {
      const q = search.toLowerCase();
      modules = modules.filter((m) => {
        const label = MODULE_LABELS[m] || m;
        if (label.toLowerCase().includes(q)) return true;
        // Chercher aussi dans les permissions cochees
        const perms = permissions.modules[m] || [];
        return perms.some((p) => {
          const actionLabel = ACTION_LABELS[p.action] || p.action;
          return actionLabel.toLowerCase().includes(q);
        });
      });
    }

    // Filtrer "seulement cochees"
    if (showOnlyChecked) {
      modules = modules.filter((m) => {
        const perms = permissions.modules[m] || [];
        return perms.some((p) => editedPermissions.has(p.id));
      });
    }

    return modules.sort((a, b) => {
      const la = MODULE_LABELS[a] || a;
      const lb = MODULE_LABELS[b] || b;
      return la.localeCompare(lb);
    });
  }, [permissions, search, showOnlyChecked, editedPermissions]);

  // Stats globales
  const stats = useMemo(() => {
    if (!permissions) return { total: 0, checked: 0, modified: 0 };
    let total = 0;
    let checked = 0;
    let modified = 0;
    const original = new Set(roleDetail?.permissions || []);

    for (const perms of Object.values(permissions.modules)) {
      for (const p of perms) {
        total++;
        if (editedPermissions.has(p.id)) checked++;
        const wasChecked = original.has(p.id);
        const isChecked = editedPermissions.has(p.id);
        if (wasChecked !== isChecked) modified++;
      }
    }
    return { total, checked, modified };
  }, [permissions, editedPermissions, roleDetail]);

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* EN-TETE                                                       */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Roles & Permissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Definissez les acces de chaque role. Cliquez sur un role pour
            modifier ses permissions.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau role
        </Button>
      </div>

      {/* ============================================================ */}
      {/* GRILLE DES ROLES                                              */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {roles?.length || 0} roles système et personnalises
          </h3>
        </div>

        {rolesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {roles?.map((role) => {
              const Icon = ROLE_ICONS[role.code] || DEFAULT_ROLE_ICON;
              const isSelected = selectedRoleId === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    "text-left rounded-lg border-2 p-4 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-accent/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {role.isSystem && (
                      <span
                        className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-flex items-center gap-1"
                        title="Role système - ne peut pas etre supprime"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Systeme
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-sm truncate">
                    {role.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mb-2 truncate">
                    {role.code}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{role.permissionsCount ?? 0} perms</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DETAIL DU ROLE SELECTIONNE                                    */}
      {/* ============================================================ */}
      {selectedRoleId && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                {roleDetail && (
                  <>
                    {(() => {
                      const Icon = ROLE_ICONS[roleDetail.code] || DEFAULT_ROLE_ICON;
                      return (
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      );
                    })()}
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {roleDetail.name}
                        <span className="text-xs font-mono text-muted-foreground font-normal">
                          {roleDetail.code}
                        </span>
                        {roleDetail.isSystem && (
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            Systeme
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-1">
                          <UsersIcon className="h-3 w-3" />
                          {roleDetail.usersCount ?? 0} utilisateur
                          {(roleDetail.usersCount ?? 0) > 1 ? "s" : ""}
                        </span>
                        <span>·</span>
                        <span className="font-mono">
                          {roleDetail.permissions.length} permissions
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!hasChanges || setPermissionsMutation.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Reinitialiser
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || setPermissionsMutation.isPending}
                >
                  {setPermissionsMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Enregistrer
                </Button>
                {!roleDetail?.isSystem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteRoleMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Role système - note */}
            {roleDetail?.isSystem && (
              <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Role système : le code et le nom ne peuvent pas etre
                  modifies. Les permissions sont verrouillees pour SUPER_ADMIN.
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Barre de filtres + stats */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un module ou une action..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={showOnlyChecked ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyChecked((v) => !v)}
                className="shrink-0"
              >
                {showOnlyChecked ? (
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                )}
                {showOnlyChecked ? "Afficher tout" : "Cochees seulement"}
              </Button>
            </div>

            {/* Resume */}
            <div className="rounded-md bg-muted/40 px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-medium">
                {stats.checked} sur {stats.total} permissions
              </span>
              {stats.modified > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-orange-600 font-medium">
                    {stats.modified} modification{stats.modified > 1 ? "s" : ""} non enregistree{stats.modified > 1 ? "s" : ""}
                  </span>
                </>
              )}
              {hasChanges && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-blue-600 font-medium">
                    Pensez a enregistrer
                  </span>
                </>
              )}
            </div>

            {/* Matrice */}
            {detailLoading || permsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedModules.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <XCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Aucun module ne correspond aux filtres
              </div>
            ) : (
              <div className="space-y-2">
                {sortedModules.map((moduleKey) => {
                  const modulePerms = permissions?.modules[moduleKey] || [];
                  const allChecked = modulePerms.every((p) =>
                    editedPermissions.has(p.id),
                  );
                  const someChecked =
                    !allChecked &&
                    modulePerms.some((p) => editedPermissions.has(p.id));
                  const isCollapsed = collapsedModules.has(moduleKey);

                  return (
                    <div
                      key={moduleKey}
                      className="border rounded-md overflow-hidden"
                    >
                      {/* Header module */}
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                        <button
                          type="button"
                          onClick={() => toggleModuleCollapse(moduleKey)}
                          className="flex items-center gap-2 text-sm font-medium flex-1 text-left"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          {MODULE_LABELS[moduleKey] || moduleKey}
                          <span className="text-xs text-muted-foreground font-normal">
                            ({modulePerms.filter((p) => editedPermissions.has(p.id)).length}/
                            {modulePerms.length})
                          </span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleModule(moduleKey, true)}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded transition-colors",
                              allChecked
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent",
                            )}
                          >
                            Tout
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleModule(moduleKey, false)}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded transition-colors",
                              !someChecked && !allChecked
                                ? "bg-muted text-muted-foreground"
                                : "text-muted-foreground hover:bg-accent",
                            )}
                          >
                            Rien
                          </button>
                        </div>
                      </div>

                      {/* Grille des permissions */}
                      {!isCollapsed && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 p-2">
                          {modulePerms.map((perm) => {
                            const checked = editedPermissions.has(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-xs",
                                  checked
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-accent",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(perm.id)}
                                  className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary"
                                />
                                <span className="truncate">
                                  {ACTION_LABELS[perm.action] || perm.action}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* MODAL CREATION                                                */}
      {/* ============================================================ */}
      {showCreateModal && (
        <CreateRoleModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

// ============================================================
// Modal de creation de role
// ============================================================
function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createRoleMutation = useCreateRole();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    await createRoleMutation.mutateAsync({
      code: code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
      name: name.trim(),
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Nouveau role</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Creez un role personnalise pour votre etablissement.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">
                Nom du role <span className="text-red-600">*</span>
              </Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Censeur"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-code">
                Code <span className="text-red-600">*</span>
              </Label>
              <Input
                id="role-code"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9_]/g, "_"),
                  )
                }
                placeholder="Ex: CENSEUR"
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Identifiant technique (A-Z, 0-9, _). Unique.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Responsable de la discipline et du suivi"
              />
            </div>
          </div>

          <div className="p-6 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createRoleMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                createRoleMutation.isPending || !code.trim() || !name.trim()
              }
            >
              {createRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Créer le role
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
