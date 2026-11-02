import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCreateSubject, useSubject } from "@/hooks/subjects";
import { useSubjectDomains } from "@/hooks/subject-domains";
import { subjectsApi } from "@/api/subjects";
import { Button, Input, Card, CardContent, Label } from "@/components/ui";
import type { CreateSubjectInput } from "@/types/subject";

const TYPE_OPTIONS = [
  { value: "CORE", label: "Obligatoire" },
  { value: "OPTIONAL", label: "Optionnelle" },
  { value: "SPORT", label: "Sport" },
  { value: "ART", label: "Art" },
] as const;

export function SubjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;
  const { data: subjectData } = useSubject(id);
  const { data: domains } = useSubjectDomains();
  const createMutation = useCreateSubject();
  const [form, setForm] = useState<CreateSubjectInput>({ code: "", name: "", description: "", subjectDomainId: null, type: "CORE", isActive: true });
  useEffect(() => {
    if (subjectData) {
      const s: any = subjectData;
      setForm({ code: s.code || "", name: s.name || "", description: s.description || "", subjectDomainId: s.subjectDomainId || null, type: s.type || "CORE", isActive: s.isActive ?? true });
    }
  }, [subjectData]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) { toast.error("Code et nom obligatoires"); return; }
    try {
      if (isEdit) { await subjectsApi.update(id!, form); toast.success("Matiere mise a jour"); }
      else { await createMutation.mutateAsync(form); }
      qc.invalidateQueries({ queryKey: ["subjects"] });
      navigate("/subjects");
    } catch (err: any) { toast.error(err?.response?.data?.message || "Erreur"); }
  };
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <Link to="/subjects" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4 mr-1" />Retour aux matieres</Link>
      <div><h1 className="text-2xl font-bold">{isEdit ? "Modifier la matiere" : "Nouvelle matiere"}</h1><p className="text-sm text-gray-500 mt-1">Renseignez les informations generales.</p></div>
      <Card><CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MATH" maxLength={20} /></div>
            <div><Label>Type *</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm">
                {TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
          </div>
          <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mathematiques" maxLength={120} /></div>
          <div><Label>Description</Label><textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (facultatif)" maxLength={500} rows={3} className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm" /></div>
          <div><Label>Domaine pedagogique</Label>
            <select value={form.subjectDomainId || ""} onChange={(e) => setForm({ ...form, subjectDomainId: e.target.value || null })} className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm">
              <option value="">-- Aucun domaine --</option>
              {(domains || []).map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-2"><input type="checkbox" id="isActive" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300" /><Label htmlFor="isActive">Matiere active</Label></div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Link to="/subjects"><Button type="button" variant="outline">Annuler</Button></Link>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="h-4 w-4 mr-2" />{isEdit ? "Enregistrer" : "Creer"}</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
