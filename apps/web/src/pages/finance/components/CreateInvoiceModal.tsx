import { useState, useMemo } from "react";
import { X, Loader2, Receipt, Plus, Trash2, Edit2, Sparkles, AlertCircle } from "lucide-react";
import { Button, Input, Label, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { StudentPicker } from "./StudentPicker";
import { AddInvoiceLineModal, type InvoiceLineDraft } from "./AddInvoiceLineModal";
import { useCreateInvoice } from "@/hooks/finance";
import { useFeeStructures } from "@/hooks/finance";
import {
  FEE_CATEGORY_LABELS,
  formatFCFA,
  type FeeStructure,
} from "@/types/finance";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  enrollments?: Array<{
    id: string;
    academicYearId: string;
    levelId?: string | null;
    level?: { id: string; name: string } | null;
  }>;
}

interface Props {
  onClose: () => void;
  preselectedStudent?: Student | null;
}

export function CreateInvoiceModal({ onClose, preselectedStudent }: Props) {
  const [student, setStudent] = useState<Student | null>(preselectedStudent || null);
  const [lines, setLines] = useState<InvoiceLineDraft[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [showGridPicker, setShowGridPicker] = useState(false);

  const createMutation = useCreateInvoice();

  // Determiner l'annee scolaire et le niveau de l'eleve
  const enrollment = student?.enrollments?.[0];
  const academicYearId = enrollment?.academicYearId || "";
  const levelId = enrollment?.levelId || enrollment?.level?.id || "";

  // Charger la grille tarifaire du niveau
  const { data: structuresData } = useFeeStructures(
    academicYearId && levelId ? { academicYearId } : {},
  );

  const structures = useMemo<FeeStructure[]>(() => {
    if (!structuresData) return [];
    const list = Array.isArray(structuresData)
      ? structuresData
      : (structuresData as any).data || [];
    return list.filter((s: FeeStructure) => s.levelId === levelId);
  }, [structuresData, levelId]);

  const total = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitAmount,
    0,
  );

  // --- Actions lignes ---
  const handleAddLine = (line: InvoiceLineDraft) => {
    setLines((prev) => [...prev, line]);
  };

  const handleEditLine = (line: InvoiceLineDraft) => {
    if (editingLineIndex === null) return;
    setLines((prev) =>
      prev.map((l, i) => (i === editingLineIndex ? line : l)),
    );
    setEditingLineIndex(null);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Ajouter depuis la grille tarifaire ---
  const handleAddFromGrid = (structure: FeeStructure) => {
    if (!structure.feeType) return;
    const line: InvoiceLineDraft = {
      feeTypeId: structure.feeType.id,
      feeTypeName: structure.feeType.name,
      feeTypeCode: structure.feeType.code,
      category: structure.feeType.category,
      description: "",
      quantity: 1,
      unitAmount: Number(structure.amount),
    };
    setLines((prev) => [...prev, line]);
  };

  // --- Tout ajouter depuis la grille ---
  const handleAddAllFromGrid = () => {
    const newLines = structures
      .filter((s) => s.feeType)
      .map((s) => ({
        feeTypeId: s.feeType!.id,
        feeTypeName: s.feeType!.name,
        feeTypeCode: s.feeType!.code,
        category: s.feeType!.category,
        description: "",
        quantity: 1,
        unitAmount: Number(s.amount),
      }));
    setLines(newLines);
    setShowGridPicker(false);
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!student || !academicYearId || lines.length === 0) return;

    try {
      await createMutation.mutateAsync({
        studentId: student.id,
        academicYearId,
        dueDate: dueDate || undefined,
        items: lines.map((l) => ({
          feeTypeId: l.feeTypeId,
          description: l.description || l.feeTypeName,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
        })),
      });
      onClose();
    } catch {
      // erreur geree par le hook
    }
  };

  const canSubmit =
    student && academicYearId && lines.length > 0 && !createMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-3xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouvelle facture</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Composez la facture élève par élève
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* CORPS */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ELEVE */}
          <div>
            <Label>Élève *</Label>
            <div className="mt-1">
              <StudentPicker
                value={student}
                onChange={setStudent}
                disabled={!!preselectedStudent}
              />
            </div>
            {student && !academicYearId && (
              <div className="flex items-center gap-1.5 text-xs text-destructive mt-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Aucune inscription active pour cet élève
              </div>
            )}
          </div>

          {/* DATES */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Date d'échéance (optionnel)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* LIGNES */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Lignes de la facture</Label>
              <div className="flex gap-2">
                {structures.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGridPicker(true)}
                    title="Ajouter les frais depuis la grille tarifaire"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Depuis la grille
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingLineIndex(null);
                    setLineModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </div>
            </div>

            {lines.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-md">
                  Aucune ligne. Cliquez sur Â« Ajouter une ligne Â» ou
                  Â« Depuis la grille Â».
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr className="text-left text-xs font-medium text-muted-foreground uppercase">
                      <th className="px-3 py-2">Frais</th>
                      <th className="px-3 py-2 text-center w-16">Qté</th>
                      <th className="px-3 py-2 text-right w-28">P.U.</th>
                      <th className="px-3 py-2 text-right w-28">Total</th>
                      <th className="px-3 py-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const info = FEE_CATEGORY_LABELS[l.category];
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <div className="font-medium">
                              {info.emoji} {l.feeTypeName}
                            </div>
                            {l.description && (
                              <div className="text-xs text-muted-foreground">
                                {l.description}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {l.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatFCFA(l.unitAmount)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {formatFCFA(l.quantity * l.unitAmount)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingLineIndex(i);
                                  setLineModalOpen(true);
                                }}
                                title="Modifier"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveLine(i)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/40 font-bold">
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-right">
                        TOTAL
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-base">
                        {formatFCFA(total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
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
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            Créer la facture
          </Button>
        </div>
      </div>

      {/* MODALE AJOUT/MODIF LIGNE */}
      {lineModalOpen && (
        <AddInvoiceLineModal
          structures={structures}
          editLine={
            editingLineIndex !== null ? lines[editingLineIndex] : null
          }
          onSave={
            editingLineIndex !== null ? handleEditLine : handleAddLine
          }
          onClose={() => {
            setLineModalOpen(false);
            setEditingLineIndex(null);
          }}
        />
      )}

      {/* MODALE GRILLE */}
      {showGridPicker && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowGridPicker(false)}
        >
          <div
            className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">
                Grille tarifaire — {enrollment?.level?.name || "Niveau"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Ajoutez un frais ou tous les frais
              </p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
              {structures.map((s) => {
                const info = s.feeType
                  ? FEE_CATEGORY_LABELS[s.feeType.category]
                  : null;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {info?.emoji} {s.feeType?.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatFCFA(Number(s.amount))}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleAddFromGrid(s);
                        setShowGridPicker(false);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between gap-2 px-6 py-4 border-t bg-muted/30">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowGridPicker(false)}
              >
                Fermer
              </Button>
              <Button type="button" onClick={handleAddAllFromGrid}>
                <Sparkles className="h-4 w-4 mr-2" />
                Tout ajouter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
