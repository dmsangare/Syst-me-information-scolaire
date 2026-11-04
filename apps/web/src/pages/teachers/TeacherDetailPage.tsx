import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2, GraduationCap, BookOpen, School, Calendar, User } from "lucide-react";
import { teachersApi } from "@/api/teachers";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { useAddSpecialty, useRemoveSpecialty } from "@/hooks/teachers";

export function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ subjectId: "", classId: "", academicYearId: "", isMain: false });

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teachers", "detail", id],
    queryFn: () => teachersApi.getById(id!),
    enabled: !!id,
  });

  const { data: subjects } = useQuery({
    queryKey: ["teachers", "subjects"],
    queryFn: async () => (await api.get("/teachers/subjects")).data?.data ?? [],
  });

  const { data: classes } = useQuery({
    queryKey: ["teachers", "classes"],
    queryFn: async () => (await api.get("/teachers/classes")).data?.data ?? [],
  });

  const { data: academicYears } = useQuery({
    queryKey: ["teachers", "academic-years"],
    queryFn: async () => (await api.get("/teachers/academic-years")).data?.data ?? [],
  });

  const addSpecialtyMut = useAddSpecialty();
  const removeSpecialtyMut = useRemoveSpecialty();

  const [newSpecialtySubjectId, setNewSpecialtySubjectId] = useState("");
  const [showAddSpecialty, setShowAddSpecialty] = useState(false);

  const assignMut = useMutation({
    mutationFn: (dto: any) => teachersApi.assign(id!, dto),
    onSuccess: () => {
      toast.success("Assignation ajoutee");
      qc.invalidateQueries({ queryKey: ["teachers", "detail", id] });
      setShowAdd(false);
      setForm({ subjectId: "", classId: "", academicYearId: "", isMain: false });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  const removeMut = useMutation({
    mutationFn: (assignmentId: string) => teachersApi.removeAssignment(id!, assignmentId),
    onSuccess: () => {
      toast.success("Assignation retiree");
      qc.invalidateQueries({ queryKey: ["teachers", "detail", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  if (isLoading) return <div className="p-6">Chargement…</div>;
  if (!teacher) return <div className="p-6">Enseignant introuvable</div>;

  const t: any = teacher;
  const assignments = t.assignments ?? [];
  const specialties = t.specialties ?? [];
  const isGeneralist = t.teacherType === "GENERALIST";
  const currentYear = academicYears?.find((y: any) => y.isCurrent);

  const submit = () => {
    if (!form.classId || !form.academicYearId) {
      return toast.error("Classe et annee obligatoires");
    }
    if (!isGeneralist && !form.subjectId) {
      return toast.error("Matiere obligatoire pour un specialiste");
    }
    const payload: any = {
      classId: form.classId,
      academicYearId: form.academicYearId,
      isMain: form.isMain,
    };
    if (!isGeneralist) payload.subjectId = form.subjectId;
    assignMut.mutate(payload);
  };

  const addSpecialty = () => {
    if (!newSpecialtySubjectId) return toast.error("Choisir une matiere");
    addSpecialtyMut.mutate(
      { teacherId: id!, subjectId: newSpecialtySubjectId },
      {
        onSuccess: () => {
          setNewSpecialtySubjectId("");
          setShowAddSpecialty(false);
        },
      }
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/teachers">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {t.lastName} {t.firstName}
              </h1>
              <span className={"px-2 py-0.5 text-xs rounded " + (isGeneralist ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>
                {isGeneralist ? "Generaliste" : "Specialiste"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.matricule} · {t.specialty || "—"}
            </p>
          </div>
        </div>
        <Link to={`/teachers/${id}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" /> Modifier
          </Button>
        </Link>
      </div>

      {/* Infos enseignant */}
      <Card>
        <CardContent className="p-6 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Telephone</p>
            <p className="font-medium">{t.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{t.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <span className={"px-2 py-0.5 text-xs rounded " + (t.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
              {t.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Diplome</p>
            <p className="font-medium">{t.diploma || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type contrat</p>
            <p className="font-medium">{t.contractType || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date embauche</p>
            <p className="font-medium">
              {t.hireDate ? new Date(t.hireDate).toLocaleDateString("fr-FR") : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Specialites (pour specialiste uniquement) */}
      {!isGeneralist && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Specialites ({specialties.length})
              </h2>
              <Button onClick={() => setShowAddSpecialty(!showAddSpecialty)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </div>

            {showAddSpecialty && (
              <div className="bg-gray-50 p-3 rounded mb-4 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Matiere</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={newSpecialtySubjectId}
                    onChange={(e) => setNewSpecialtySubjectId(e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    {subjects?.filter((s: any) => !specialties.some((sp: any) => sp.subjectId === s.id)).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={addSpecialty} disabled={addSpecialtyMut.isPending}>Ajouter</Button>
                <Button variant="outline" onClick={() => setShowAddSpecialty(false)}>Annuler</Button>
              </div>
            )}

            {specialties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune specialite definie.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {specialties.map((sp: any) => (
                  <span key={sp.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                    {sp.subject?.code} — {sp.subject?.name}
                    <button
                      onClick={() => {
                        if (confirm("Retirer cette specialite ?"))
                          removeSpecialtyMut.mutate({ teacherId: id!, specialtyId: sp.id });
                      }}
                      className="ml-1 hover:bg-blue-100 rounded p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignations */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> {isGeneralist ? "Classes affectees" : "Matieres et classes assignees"}
            </h2>
            <Button onClick={() => {
              setShowAdd(!showAdd);
              if (currentYear) setForm((f) => ({ ...f, academicYearId: currentYear.id }));
            }}>
              <Plus className="h-4 w-4 mr-2" /> {isGeneralist ? "Affecter a une classe" : "Assigner"}
            </Button>
          </div>

          {showAdd && (
            <div className="bg-gray-50 p-4 rounded mb-4 space-y-3">
              <div className={isGeneralist ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-3"}>
                {!isGeneralist && (
                  <div>
                    <label className="text-xs text-muted-foreground">Matiere *</label>
                    <select
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={form.subjectId}
                      onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                    >
                      <option value="">— Choisir —</option>
                      {subjects?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Classe *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  >
                    <option value="">— Choisir —</option>
                    {classes?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Annee scolaire *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.academicYearId}
                    onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
                  >
                    <option value="">— Choisir —</option>
                    {academicYears?.map((y: any) => (
                      <option key={y.id} value={y.id}>
                        {y.label} {y.isCurrent ? "(actuelle)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={form.isMain}
                      onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
                    />
                    <span className="text-sm">Titulaire</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
                <Button onClick={submit} disabled={assignMut.isPending}>Ajouter</Button>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 border-b">
              <tr>
                {!isGeneralist && <th className="p-2">Matiere</th>}
                <th className="p-2">Classe</th>
                <th className="p-2">Annee</th>
                <th className="p-2">Role</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => (
                <tr key={a.id} className="border-b">
                  {!isGeneralist && <td className="p-2 font-medium">{a.subject?.name ?? "—"}</td>}
                  <td className="p-2">{a.class?.name ?? "—"}</td>
                  <td className="p-2 text-gray-500">{a.academicYear?.label ?? "—"}</td>
                  <td className="p-2">
                    {a.isMain && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Titulaire</span>}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      className="p-1.5 hover:bg-red-50 rounded text-red-600"
                      onClick={() => {
                        if (confirm("Retirer cette assignation ?")) removeMut.mutate(a.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!assignments.length && (
                <tr>
                  <td colSpan={isGeneralist ? 4 : 5} className="p-6 text-center text-gray-400">
                    Aucune assignation. Clique sur "{isGeneralist ? "Affecter a une classe" : "Assigner"}" pour ajouter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}