import { useMemo, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, BookOpen, Users, Layers, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  useClassSubjects,
  useCreateClassSubject,
  useBulkCreateClassSubject,
  useUpdateClassSubject,
  useDeleteClassSubject,
  useReorderClassSubjects,
} from "@/hooks/class-subjects/useClassSubjects";
import { useClasses, useAcademicYears } from "@/hooks/classes/useClasses";
import { useSubjects } from "@/hooks/subjects/useSubjects";
import type { ClassSubject } from "@/types/class-subject";

const CYCLE_1 = "PREMIER_CYCLE";
const CYCLE_2 = "DEUXIEME_CYCLE";

function scaleForCycle(cycle: string | undefined): 10 | 20 {
  return cycle === CYCLE_2 ? 20 : 10;
}

function isLevelInCycle(levelName: string | undefined, cycle: string | undefined): boolean {
  if (!levelName || !cycle) return true;
  const m = levelName.match(/^(\d+)/);
  if (!m) return true;
  const num = parseInt(m[1], 10);
  if (cycle === CYCLE_1) return num >= 1 && num <= 6;
  if (cycle === CYCLE_2) return num >= 7 && num <= 9;
  return true;
}

export default function ClassSubjectsPage() {
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [cycle, setCycle] = useState<string>("");
  const [levelId, setLevelId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  const { data: years } = useAcademicYears();
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();

  const currentYearId = useMemo(() => {
    if (academicYearId) return academicYearId;
    const current = years?.find((y) => y.isCurrent);
    return current?.id || years?.[0]?.id || "";
  }, [academicYearId, years]);

  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter((c) => {
      if (levelId && c.levelId !== levelId) return false;
      return true;
    });
  }, [classes, levelId]);

  const selectedClass = useMemo(
    () => classes?.find((c) => c.id === classId),
    [classes, classId],
  );

  const autoScale = scaleForCycle(cycle);

  const { data: classSubjects, isLoading } = useClassSubjects(
    { classId: classId || undefined, academicYearId: currentYearId || undefined },
    Boolean(classId && currentYearId),
  );

  const createMut = useCreateClassSubject();
  const bulkMut = useBulkCreateClassSubject();
  const updateMut = useUpdateClassSubject();
  const deleteMut = useDeleteClassSubject();
  const reorderMut = useReorderClassSubjects();

  const sorted = useMemo(
    () => (classSubjects || []).slice().sort((a, b) => a.displayOrder - b.displayOrder),
    [classSubjects],
  );

  const missingSubjects = useMemo(() => {
    if (!subjects || !classSubjects) return [];
    const used = new Set(classSubjects.map((cs) => cs.subjectId));
    return subjects.filter((s) => !used.has(s.id) && s.isActive !== false);
  }, [subjects, classSubjects]);

  const handleMove = (cs: ClassSubject, dir: "up" | "down") => {
    const idx = sorted.findIndex((x) => x.id === cs.id);
    if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= sorted.length) return;
    const reordered = sorted.slice();
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    reorderMut.mutate({
      items: reordered.map((item, i) => ({ id: item.id, displayOrder: (i + 1) * 10 })),
    });
  };

  const handleToggleActive = (cs: ClassSubject) => {
    updateMut.mutate({ id: cs.id, input: { isActive: !cs.isActive } });
  };

  const handleToggleMandatory = (cs: ClassSubject) => {
    updateMut.mutate({ id: cs.id, input: { isMandatory: !cs.isMandatory } });
  };

  const handleChangeScale = (cs: ClassSubject, scale: 10 | 20) => {
    updateMut.mutate({ id: cs.id, input: { scale } });
  };

  const handleDelete = (cs: ClassSubject) => {
    if (!confirm("Desactiver l'affectation " + (cs.subject?.name || "") + " ?")) return;
    deleteMut.mutate(cs.id);
  };

  const activeCount = sorted.filter((cs) => cs.isActive).length;
  const mandatoryCount = sorted.filter((cs) => cs.isMandatory).length;
  const totalAssessments = sorted.reduce((acc, cs) => acc + (cs._count?.assessments || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Affectation des matieres</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurer les matieres enseignees par classe et par annee scolaire
          </p>
        </div>
        <Button onClick={() => setShowBulkModal(true)} disabled={!classId || !currentYearId}>
          <Plus className="h-4 w-4 mr-2" />
          Affecter des matieres
        </Button>
      </div>

      {/* Filtres en cascade */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Annee scolaire</label>
          <Select value={currentYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {years?.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.label}{y.isCurrent ? " (courante)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Cycle</label>
          <Select value={cycle} onValueChange={(v) => { setCycle(v); setLevelId(""); setClassId(""); }}>
            <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={CYCLE_1}>Premier cycle (1ere-6eme)</SelectItem>
              <SelectItem value={CYCLE_2}>Deuxieme cycle (7eme-9eme)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Classe</label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {filteredClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <div className="text-xs text-muted-foreground">
            Echelle auto : <span className="font-semibold text-foreground">/{autoScale}</span>
          </div>
        </div>
      </div>

      {/* KPI inline */}
      {classId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <BookOpen className="h-4 w-4" /> Matieres affectees
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{sorted.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <Layers className="h-4 w-4" /> Actives
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">{activeCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <AlertCircle className="h-4 w-4" /> Obligatoires
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{mandatoryCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-2 text-purple-700 text-sm">
              <Users className="h-4 w-4" /> Evaluations
            </div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{totalAssessments}</div>
          </div>
        </div>
      )}


      {/* Tableau */}
      {!classId && (
        <div className="p-12 text-center bg-card rounded-lg border">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Selectionnez une classe</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Choisissez une annee scolaire et une classe pour voir et gerer les matieres affectees.
          </p>
        </div>
      )}

      {classId && isLoading && (
        <div className="p-12 text-center bg-card rounded-lg border">
          <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
          <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
        </div>
      )}

      {classId && !isLoading && sorted.length === 0 && (
        <div className="p-12 text-center bg-card rounded-lg border">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Aucune matiere affectee</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Cette classe n'a encore aucune matiere. Commencez par en affecter.
          </p>
          <Button onClick={() => setShowBulkModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Affecter des matieres
          </Button>
        </div>
      )}

      {classId && !isLoading && sorted.length > 0 && (
        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold w-16">Ordre</th>
                <th className="px-4 py-3 font-semibold">Matiere</th>
                <th className="px-4 py-3 font-semibold w-24">Echelle</th>
                <th className="px-4 py-3 font-semibold w-32">Obligatoire</th>
                <th className="px-4 py-3 font-semibold w-32">Statut</th>
                <th className="px-4 py-3 font-semibold w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((cs, idx) => (
                <tr key={cs.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cs.displayOrder}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{cs.subject?.name || "-"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{cs.subject?.code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={String(cs.scale)}
                      onValueChange={(v) => handleChangeScale(cs, v === "20" ? 20 : 10)}
                    >
                      <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">/10</SelectItem>
                        <SelectItem value="20">/20</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleMandatory(cs)}
                      className={
                        "px-2 py-1 rounded text-xs font-medium " +
                        (cs.isMandatory
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                      }
                    >
                      {cs.isMandatory ? "Obligatoire" : "Facultatif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(cs)}
                      className={
                        "px-2 py-1 rounded text-xs font-medium " +
                        (cs.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200")
                      }
                    >
                      {cs.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleMove(cs, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                        title="Monter"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMove(cs, "down")}
                        disabled={idx === sorted.length - 1}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                        title="Descendre"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cs)}
                        className="p-1 rounded hover:bg-red-50 text-red-600"
                        title="Desactiver"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale d'affectation (bulk) */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Affecter des matieres"
      >
        {showBulkModal && (
          <BulkAssignForm
            defaultScale={autoScale}
            availableSubjects={missingSubjects}
            onSubmit={(subjects) => {
              bulkMut.mutate(
                { classId, academicYearId: currentYearId, subjects },
                {
                  onSuccess: () => {
                    setShowBulkModal(false);
                  },
                },
              );
            }}
            onCancel={() => setShowBulkModal(false)}
            isLoading={bulkMut.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// Composant interne : formulaire d'affectation multiple
// ============================================================
interface BulkAssignFormProps {
  defaultScale: 10 | 20;
  availableSubjects: Array<{ id: string; code: string; name: string }>;
  onSubmit: (subjects: Array<{ subjectId: string; scale: 10 | 20 }>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function BulkAssignForm({
  defaultScale,
  availableSubjects,
  onSubmit,
  onCancel,
  isLoading,
}: BulkAssignFormProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    const subjects = Array.from(selected).map((subjectId) => ({
      subjectId,
      scale: defaultScale,
    }));
    onSubmit(subjects);
  };

  if (availableSubjects.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Toutes les matieres actives sont deja affectees a cette classe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selectionnez les matieres a affecter. Echelle par defaut : /{defaultScale}
      </p>
      <div className="max-h-96 overflow-y-auto space-y-1 border rounded-md p-2">
        {availableSubjects.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
              className="h-4 w-4"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{s.code}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={selected.size === 0 || isLoading} isLoading={isLoading}>
          Affecter {selected.size > 0 ? "(" + selected.size + ")" : ""}
        </Button>
      </div>
    </div>
  );
}

