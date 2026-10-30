import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  AlertCircle,
  BookOpen,
  Users,
  MapPin,
  UserCircle2,
  Calendar,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useCreateClass,
  useLevels,
  useRooms,
  useTeachers,
  useAcademicYears,
} from "@/hooks/classes";
import type { LevelCycle, CreateClassInput } from "@/types/class";

interface CreateClassModalProps {
  defaultCycle?: LevelCycle;
  onClose: () => void;
}

export function CreateClassModal({
  defaultCycle = "PREMIER_CYCLE",
  onClose,
}: CreateClassModalProps) {
  const [cycle, setCycle] = useState<LevelCycle>(defaultCycle);
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [levelId, setLevelId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(50);
  const [mainTeacherId, setMainTeacherId] = useState<string>("");

  const { data: levels, isLoading: levelsLoading } = useLevels(cycle);
  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: academicYears, isLoading: yearsLoading } = useAcademicYears();
  const createMutation = useCreateClass();

  useEffect(() => {
    if (academicYears && academicYears.length > 0 && !academicYearId) {
      const current = academicYears.find((y) => y.isCurrent) || academicYears[0];
      setAcademicYearId(current.id);
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    setLevelId("");
  }, [cycle]);

  useEffect(() => {
    if (codeManuallyEdited) return;
    if (!name.trim()) {
      setCode("");
      return;
    }
    const numMatch = name.match(/\d+/);
    const letterMatch = name.match(/[A-Za-z](?=\s*$)/);
    const num = numMatch ? numMatch[0] : "";
    const letter = letterMatch ? letterMatch[0].toUpperCase() : "";
    if (num) {
      setCode(`${num}${letter}`);
    }
  }, [name, codeManuallyEdited]);

  useEffect(() => {
    if (name.trim()) return;
    if (!code.trim()) return;
    const match = code.match(/^(\d+)([A-Za-z])?$/);
    if (match) {
      const num = match[1];
      const letter = match[2] ? ` ${match[2].toUpperCase()}` : "";
      const suffix = num === "1" ? "ère" : "ème";
      setName(`${num}${suffix}${letter}`);
    }
  }, [code, name]);

  // ✅ CORRECTION : Le prof principal est obligatoire au 1er cycle
  const isFirstCycle = cycle === "PREMIER_CYCLE";
  const teacherRequired = isFirstCycle;
  const teacherMissing = teacherRequired && !mainTeacherId;

  const formValid =
    academicYearId &&
    levelId &&
    name.trim() &&
    code.trim() &&
    capacity > 0 &&
    !teacherMissing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    const input: CreateClassInput = {
      academicYearId,
      levelId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      capacity,
      roomId: roomId || null,
      mainTeacherId: mainTeacherId || null,
    };

    try {
      await createMutation.mutateAsync(input);
      onClose();
    } catch {
      // erreur geree par le hook
    }
  };

  const isSpecialist = (specialty?: string | null): boolean => {
    if (!specialty) return false;
    const s = specialty.toLowerCase();
    return (
      s.includes("math") ||
      s.includes("physique") ||
      s.includes("chimie") ||
      s.includes("francais") ||
      s.includes("français") ||
      s.includes("anglais") ||
      s.includes("histoire") ||
      s.includes("geo") ||
      s.includes("svt") ||
      s.includes("biologie") ||
      s.includes("science") ||
      s.includes("arabe")
    );
  };

  const selectedTeacher = teachers?.find((t) => t.id === mainTeacherId);
  const selectedIsSpecialist = selectedTeacher
    ? isSpecialist(selectedTeacher.specialty)
    : false;
  const showSpecialistWarning =
    isFirstCycle && selectedIsSpecialist && !!mainTeacherId;

  const sortedLevels = useMemo(() => {
    if (!levels) return [];
    return [...levels].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [levels]);

  const sortedRooms = useMemo(() => {
    if (!rooms) return [];
    return [...rooms].sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const sortedTeachers = useMemo(() => {
    if (!teachers) return [];
    return [...teachers].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
      ),
    );
  }, [teachers]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 overflow-y-auto backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl max-w-2xl w-full my-8 relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-lg font-semibold">Nouvelle classe</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Créez une classe pour l'année scolaire en cours
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div>
              <Label htmlFor="academicYear" className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Année scolaire
              </Label>
              {yearsLoading ? (
                <div className="h-10 rounded-md bg-muted animate-pulse mt-1" />
              ) : (
                <select
                  id="academicYear"
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-sis-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand"
                  required
                >
                  <option value="">-- Sélectionner --</option>
                  {academicYears?.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label} {y.isCurrent ? "(en cours)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <BookOpen className="h-3.5 w-3.5" />
                Cycle
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCycle("PREMIER_CYCLE")}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-sis-md border-2 text-left transition-all",
                    cycle === "PREMIER_CYCLE"
                      ? "border-sis-brand bg-sis-brand-50 dark:bg-sis-brand-900/30"
                      : "border-input hover:border-sis-brand/50",
                  )}
                >
                  <span className="font-medium text-sm">
                    📗 Premier cycle
                  </span>
                  <span className="text-xs text-muted-foreground">
                    1ère → 6ème année
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCycle("DEUXIEME_CYCLE")}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-sis-md border-2 text-left transition-all",
                    cycle === "DEUXIEME_CYCLE"
                      ? "border-sis-info bg-sis-info-bg dark:bg-sis-info-bg/30"
                      : "border-input hover:border-sis-info/50",
                  )}
                >
                  <span className="font-medium text-sm">
                    📘 Deuxième cycle
                  </span>
                  <span className="text-xs text-muted-foreground">
                    7ème → 9ème année
                  </span>
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="level">Niveau</Label>
              {levelsLoading ? (
                <div className="h-10 rounded-md bg-muted animate-pulse mt-1" />
              ) : (
                <select
                  id="level"
                  value={levelId}
                  onChange={(e) => setLevelId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-sis-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand"
                  required
                >
                  <option value="">-- Sélectionner --</option>
                  {sortedLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nom de la classe</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: 1ère A"
                  className="mt-1 rounded-sis-md focus:ring-sis-brand/30 focus:border-sis-brand"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tapez le nom, le code se génère automatiquement
                </p>
              </div>
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setCodeManuallyEdited(true);
                  }}
                  placeholder="1A"
                  className="mt-1 font-mono uppercase rounded-sis-md focus:ring-sis-brand/30 focus:border-sis-brand"
                  maxLength={10}
                  required
                />
                {codeManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => setCodeManuallyEdited(false)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Re-générer auto
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room" className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Salle (optionnel)
                </Label>
                {roomsLoading ? (
                  <div className="h-10 rounded-md bg-muted animate-pulse mt-1" />
                ) : (
                  <select
                    id="room"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="mt-1 w-full h-10 rounded-sis-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand"
                  >
                    <option value="">-- Aucune --</option>
                    {sortedRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <Label htmlFor="capacity" className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Capacité max
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={200}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                  className="mt-1 rounded-sis-md focus:ring-sis-brand/30 focus:border-sis-brand"
                  required
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="teacher"
                className="flex items-center gap-2 flex-wrap"
              >
                <UserCircle2 className="h-3.5 w-3.5" />
                Professeur principal
                {teacherRequired && (
                  <span className="text-xs text-destructive font-semibold">
                    * Obligatoire (1er cycle)
                  </span>
                )}
                {!teacherRequired && (
                  <span className="text-xs text-muted-foreground">
                    (optionnel en 2ème cycle)
                  </span>
                )}
              </Label>
              {teachersLoading ? (
                <div className="h-10 rounded-md bg-muted animate-pulse mt-1" />
              ) : (
                <select
                  id="teacher"
                  value={mainTeacherId}
                  onChange={(e) => setMainTeacherId(e.target.value)}
                  className={cn(
                    "mt-1 w-full h-10 rounded-sis-md border bg-background px-3 text-sm focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand",
                    teacherMissing
                      ? "border-destructive"
                      : "border-input",
                  )}
                >
                  <option value="">-- Sélectionner --</option>
                  {sortedTeachers.map((t) => {
                    const isSpec = isSpecialist(t.specialty);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.lastName} {t.firstName}
                        {t.specialty ? ` — ${t.specialty}` : ""}
                        {isSpec ? " [2e cycle]" : ""}
                      </option>
                    );
                  })}
                </select>
              )}
              {teacherMissing && (
                <div className="flex items-start gap-2 mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded p-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Le professeur principal est <strong>obligatoire</strong>{" "}
                    pour les classes du premier cycle.
                  </span>
                </div>
              )}
              {showSpecialistWarning && (
                <div className="flex items-start gap-2 mt-2 text-xs text-sis-warning bg-sis-warning-bg border border-sis-warning-border rounded p-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Ce professeur est <strong>spécialisé</strong> (2ème cycle). Pour un premier cycle, préférez un <strong>instituteur polyvalent</strong>. Vous pouvez continuer si nécessaire.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!formValid || createMutation.isPending}
              className="bg-sis-brand hover:bg-sis-brand-600 text-sis-brand-foreground"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Créer la classe
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}