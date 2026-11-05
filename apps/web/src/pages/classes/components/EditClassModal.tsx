import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Save } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useUpdateClass, useRooms, useTeachers } from "@/hooks/classes";
import type { ClassItem, LevelCycle } from "@/types/class";

interface EditClassModalProps {
  classItem: ClassItem;
  onClose: () => void;
}

export function EditClassModal({ classItem, onClose }: EditClassModalProps) {
  const [name, setName] = useState(classItem.name);
  const [code, setCode] = useState(classItem.code);
  const [roomId, setRoomId] = useState(classItem.roomId || "");
  const [capacity, setCapacity] = useState<number>(classItem.capacity || 50);
  const [mainTeacherId, setMainTeacherId] = useState(
    classItem.mainTeacherId || "",
  );
  const [status, setStatus] = useState(classItem.status);

  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const updateMutation = useUpdateClass();

  const cycle: LevelCycle =
    (classItem.level?.cycle as LevelCycle) || "PREMIER_CYCLE";
  const isFirstCycle = cycle === "PREMIER_CYCLE";
  const teacherRequired = isFirstCycle;

  // Auto-generation code depuis nom (sauf si l'utilisateur a modifié manuellement)
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(true);

  useEffect(() => {
    if (codeManuallyEdited) return;
    if (!name.trim()) return;
    const numMatch = name.match(/\d+/);
    const letterMatch = name.match(/[A-Za-z](?=\s*$)/);
    const num = numMatch ? numMatch[0] : "";
    const letter = letterMatch ? letterMatch[0].toUpperCase() : "";
    if (num) setCode(`${num}${letter}`);
  }, [name, codeManuallyEdited]);

  const teacherMissing = teacherRequired && !mainTeacherId;
  const formValid =
    name.trim() && code.trim() && capacity > 0 && !teacherMissing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    const dto: any = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      capacity: Number(capacity),
    };

    // Optionnels : envoyer null explicitement pour permettre le "retrait"
    dto.roomId = roomId && roomId.trim() ? roomId : null;
    dto.mainTeacherId =
      mainTeacherId && mainTeacherId.trim() ? mainTeacherId : null;
    dto.status = status;

    try {
      await updateMutation.mutateAsync({ id: classItem.id, input: dto });
      onClose();
    } catch {
      // erreur geree par le hook
    }
  };

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

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-lg font-semibold">Modifier la classe</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {classItem.level?.name} · {isFirstCycle ? "1er cycle" : "2eme cycle"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* CORPS */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* NOM + CODE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nom de la classe</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: 1ere A"
                  className="mt-1"
                  required
                />
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
                  className="mt-1 font-mono uppercase"
                  maxLength={10}
                  required
                />
                {!codeManuallyEdited && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-genere depuis le nom
                  </p>
                )}
              </div>
            </div>

            {/* SALLE + CAPACITE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room">Salle</Label>
                {roomsLoading ? (
                  <div className="h-10 rounded-md bg-muted animate-pulse mt-1" />
                ) : (
                  <select
                    id="room"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
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
                <Label htmlFor="capacity">Capacite max</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={200}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            {/* TITULAIRE */}
            <div>
              <Label htmlFor="teacher" className="flex items-center gap-2 flex-wrap">
                Professeur principal
                {teacherRequired && (
                  <span className="text-xs text-destructive font-semibold">
                    * Obligatoire (1er cycle)
                  </span>
                )}
                {!teacherRequired && (
                  <span className="text-xs text-muted-foreground">
                    (optionnel)
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
                    "mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm",
                    teacherMissing ? "border-destructive" : "border-input",
                  )}
                >
                  <option value="">-- Aucun --</option>
                  {sortedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.lastName} {t.firstName}
                      {t.specialty ? ` — ${t.specialty}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {teacherMissing && (
                <p className="text-xs text-destructive mt-1">
                  Le titulaire est obligatoire pour le premier cycle.
                </p>
              )}
            </div>

            {/* STATUT */}
            <div>
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="OPEN">Ouverte</option>
                <option value="CLOSED">Fermee</option>
                <option value="ARCHIVED">Archivee</option>
              </select>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!formValid || updateMutation.isPending}
              className={cn(
                isFirstCycle
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700",
              )}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
