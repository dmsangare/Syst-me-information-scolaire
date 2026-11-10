import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { useCreateCampaign } from "@/hooks/campaigns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

interface Props {
  onClose: () => void;
}

export function CreateCampaignModal({ onClose }: Props) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const createMutation = useCreateCampaign();

  const { data: years } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const { data } = await api.get("/academic-years");
      return data.data || data;
    },
  });

  const { data: terms } = useQuery({
    queryKey: ["terms", academicYearId],
    queryFn: async () => {
      const { data } = await api.get("/terms", { params: { academicYearId } });
      return data.data || data;
    },
    enabled: !!academicYearId,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes", academicYearId],
    queryFn: async () => {
      const { data } = await api.get("/classes", { params: { academicYearId } });
      return data.data || data;
    },
    enabled: !!academicYearId,
  });

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!termId || selectedClassIds.length === 0) {
      alert("Selectionnez un terme et au moins une classe.");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({ termId, classIds: selectedClassIds });
      alert(`${result.created} composition(s) creee(s). ${result.skipped} ignoree(s).`);
      onClose();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Erreur lors de la creation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-sis-lg bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nouvelle composition</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Annee scolaire</label>
            <select
              value={academicYearId}
              onChange={(e) => { setAcademicYearId(e.target.value); setTermId(""); setSelectedClassIds([]); }}
              className="w-full rounded-sis-md border border-sis-neutral-200 bg-background px-3 py-2 text-sm"
            >
              <option value="">- Selectionner -</option>
              {years?.map((y: any) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Terme (mois ou trimestre)</label>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="w-full rounded-sis-md border border-sis-neutral-200 bg-background px-3 py-2 text-sm"
              disabled={!academicYearId}
            >
              <option value="">- Selectionner -</option>
              {terms?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type === "MOIS" ? "Mois" : "Trimestre"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Classes ({selectedClassIds.length} selectionnee(s))
            </label>
            <div className="max-h-48 overflow-y-auto rounded-sis-md border border-sis-neutral-200 p-2 space-y-1">
              {classes?.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{c.name} <span className="text-muted-foreground">({c.level?.name})</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creation..." : "Creer"}
          </Button>
        </div>
      </div>
    </div>
  );
}