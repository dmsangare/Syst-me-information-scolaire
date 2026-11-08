import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, CheckCircle2, XCircle, Clock, Users, AlertCircle,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, Button, PageLoader, EmptyState,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import {
  useAttendanceClassesStatus,
  useAttendanceByClass,
  useCreateDailyAttendance,
  useUpdateAttendanceRecord,
} from "@/hooks/attendance/useDailyAttendance";

type Status = "PRESENT" | "ABSENT" | "LATE";

const STATUS_CONFIG: Record<Status, { label: string; icon: any; color: string; bg: string }> = {
  PRESENT: { label: "Présent", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500" },
  ABSENT: { label: "Absent", icon: XCircle, color: "text-red-600", bg: "bg-red-500" },
  LATE: { label: "Retard", icon: Clock, color: "text-amber-600", bg: "bg-amber-500" },
};

interface StudentLite {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  gender: string;
}

export function DailyCallPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isReadOnly = useIsReadOnly();

  const selectedClassId = searchParams.get("classId") || "";
  const today = new Date().toISOString().split("T")[0];

  const { data: classesData, isLoading: classesLoading } = useAttendanceClassesStatus();
  const { data: existingSession, isLoading: sessionLoading } = useAttendanceByClass(selectedClassId);
  const createMut = useCreateDailyAttendance();
  const updateMut = useUpdateAttendanceRecord();

  // Charger les élèves de la classe
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["class-students", selectedClassId],
    queryFn: async () => {
      const { data } = await api.get("/students", {
        params: { classId: selectedClassId, limit: 200 },
      });
      return (data?.data || data || []) as StudentLite[];
    },
    enabled: !!selectedClassId,
    staleTime: 60_000,
  });

  const [records, setRecords] = useState<Record<string, Status>>({});

  const classes = classesData?.classes ?? [];
  const selectedClass = classes.find((c) => c.classId === selectedClassId);

  // Liste des élèves : session existante OU liste des inscrits
  const students: StudentLite[] = useMemo(() => {
    if (existingSession?.records) {
      return existingSession.records.map((r) => r.student);
    }
    return studentsData ?? [];
  }, [existingSession, studentsData]);

  // Initialiser les statuts
  useEffect(() => {
    if (!selectedClassId) return;
    if (existingSession?.records) {
      const map: Record<string, Status> = {};
      for (const r of existingSession.records) {
        map[r.studentId] = r.status as Status;
      }
      setRecords(map);
    } else if (studentsData) {
      const map: Record<string, Status> = {};
      for (const s of studentsData) {
        map[s.id] = "PRESENT";
      }
      setRecords(map);
    }
  }, [existingSession, studentsData, selectedClassId]);

  const counts = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    for (const s of Object.values(records)) {
      if (s === "PRESENT") present++;
      else if (s === "ABSENT") absent++;
      else if (s === "LATE") late++;
    }
    return { present, absent, late, total: present + absent + late };
  }, [records]);

  const handleStatusChange = (studentId: string, status: Status) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSelectClass = (classId: string) => {
    setSearchParams({ classId }, { replace: true });
    setRecords({});
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedClass) return;
    if (existingSession) {
      const updates: Promise<any>[] = [];
      for (const rec of existingSession.records) {
        const newStatus = records[rec.studentId];
        if (newStatus && newStatus !== rec.status) {
          updates.push(
            updateMut.mutateAsync({
              recordId: rec.id,
              dto: { status: newStatus, reason: "Correction manuelle" },
            })
          );
        }
      }
      if (updates.length === 0) {
        toast.info("Aucune modification à enregistrer");
        return;
      }
      await Promise.all(updates);
      navigate("/attendance");
      return;
    }

    if (Object.keys(records).length === 0) {
      toast.error("Aucun élève à enregistrer");
      return;
    }

    await createMut.mutateAsync({
      classId: selectedClassId,
      date: today,
      records: Object.entries(records).map(([studentId, status]) => ({
        studentId,
        status,
      })),
    });
    navigate("/attendance");
  };

  if (!selectedClassId) {
    if (classesLoading) return <PageLoader label="Chargement..." />;
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/attendance" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Effectuer un appel</h1>
            <p className="text-sm text-muted-foreground">Choisissez une classe</p>
          </div>
        </div>
        <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-4">Sélectionnez la classe :</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <button
                  key={c.classId}
                  onClick={() => handleSelectClass(c.classId)}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{c.className}</p>
                    <p className="text-xs text-slate-500">
                      {c.totalStudents} élève{c.totalStudents > 1 ? "s" : ""}
                      {c.status === "DONE" && " · déjà appelé"}
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-slate-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionLoading || studentsLoading) {
    return <PageLoader label="Chargement de l'appel..." />;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/attendance" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Appel - {selectedClass?.className}</h1>
            <p className="text-sm text-muted-foreground">
              {today} · {students.length} élève{students.length > 1 ? "s" : ""}
              {existingSession && " · déjà appelé (modification)"}
            </p>
          </div>
        </div>
      </div>

      {students.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              title="Aucun élève"
              description="Aucun élève n'est inscrit dans cette classe pour l'année en cours."
            />
          </CardContent>
        </Card>
      )}

      {students.length > 0 && (
        <>
          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Liste des élèves</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-600 font-medium">{counts.present} présent{counts.present > 1 ? "s" : ""}</span>
                  <span className="text-red-600 font-medium">{counts.absent} absent{counts.absent > 1 ? "s" : ""}</span>
                  <span className="text-amber-600 font-medium">{counts.late} retard{counts.late > 1 ? "s" : ""}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {students.map((st, idx) => {
                  const currentStatus = records[st.id] ?? "PRESENT";
                  return (
                    <div key={st.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono w-6">{String(idx + 1).padStart(2, "0")}</span>
                        <div>
                          <p className="font-medium text-slate-800">{st.lastName} {st.firstName}</p>
                          <p className="text-xs text-slate-500">{st.matricule}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(["PRESENT", "ABSENT", "LATE"] as Status[]).map((s) => {
                          const cfg = STATUS_CONFIG[s];
                          const Icon = cfg.icon;
                          const isActive = currentStatus === s;
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(st.id, s)}
                              disabled={isReadOnly}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                isActive ? `${cfg.bg} text-white border-transparent shadow-sm` : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                              } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {!isReadOnly && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate("/attendance")}>Annuler</Button>
              <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />{existingSession ? "Enregistrer les modifications" : "Enregistrer l'appel"}</>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}