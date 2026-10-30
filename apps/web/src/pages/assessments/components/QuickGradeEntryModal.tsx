import { useState } from "react";
import { X, Loader2, Search } from "lucide-react";
import { Button, Label } from "@/components/ui";
import { useClasses } from "@/hooks/classes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import { useAssessments } from "@/hooks/assessments";

interface Props {
  onClose: () => void;
}

export function QuickGradeEntryModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  
  const { data: classes } = useClasses();
  
  const { data: subjects } = useQuery({
    queryKey: ["subjects", "list"],
    queryFn: async () => {
      const { data } = await api.get("/subjects");
      return data.data || data;
    },
  });

  // On récupère les évaluations existantes pour cette classe/matière
  const { data: assessments, isLoading } = useAssessments({ classId, subjectId });

  const handleSearch = () => {
    if (!classId || !subjectId) return;
    
    const list = Array.isArray(assessments) ? assessments : assessments?.data || [];
    // On cherche une évaluation ouverte ou en brouillon
    const target = list.find((a: any) => ["OPEN", "DRAFT"].includes(a.status));
    
    if (target) {
      navigate(`/assessments/${target.id}/grades`);
      onClose();
    } else {
      alert("Aucune évaluation en cours (brouillon ou ouverte) pour cette classe et cette matière. Veuillez d'abord créer une évaluation.");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Saisir des notes</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Trouvez une évaluation en cours pour saisir les notes.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <Label>Classe</Label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">-- Sélectionner --</option>
              {classes?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Matière</Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">-- Sélectionner --</option>
              {subjects?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSearch} disabled={!classId || !subjectId || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Rechercher l'évaluation
          </Button>
        </div>
      </div>
    </div>
  );
}