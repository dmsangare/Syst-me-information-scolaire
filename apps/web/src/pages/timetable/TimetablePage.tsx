import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { timetableApi } from '@/api/timetable';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/hooks/classes';
import { useStudentProfile } from '@/hooks/students/useStudentProfile';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function formatTime(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

function dateToHour(dateStr: string): number {
  if (!dateStr) return 0;
  if (/^\d{2}:\d{2}/.test(dateStr)) {
    return parseInt(dateStr.slice(0, 2), 10);
  }
  const d = new Date(dateStr);
  return d.getUTCHours();
}

export default function TimetablePage() {
  const { hasPermission, user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT') || user?.roles?.includes('PARENT');
  const canCreate = hasPermission('timetable:create');
  const canDelete = hasPermission('timetable:delete');
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({
    subjectId: '', teacherId: '', roomId: '',
    dayOfWeek: 1, startHour: 8, endHour: 9, weekPattern: 0,
  });

  const { data: studentProfile } = useStudentProfile();
  const { data: classes } = useClasses();

  const { data: years } = useQuery({
    queryKey: ['timetable', 'years'],
    queryFn: async () => {
      try {
        const res = await api.get('/teachers/academic-years');
        return res.data?.data ?? [];
      } catch {
        try {
          const res = await api.get('/academic-years/current');
          return res.data ? [res.data] : [];
        } catch {
          return [];
        }
      }
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['timetable', 'subjects'],
    queryFn: async () => (await api.get('/teachers/subjects')).data?.data ?? [],
  });

  const { data: rooms } = useQuery({
    queryKey: ['timetable', 'rooms'],
    queryFn: async () => {
      try {
        const res = await api.get('/rooms');
        return res.data?.data ?? res.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: slots, isLoading } = useQuery({
    queryKey: ['timetable', 'slots', classId, academicYearId],
    queryFn: () => timetableApi.list({ classId, academicYearId }),
    enabled: !!classId && !!academicYearId,
  });

  useMemo(() => {
    if (years && !academicYearId) {
      const cur = years.find((y: any) => y.isCurrent);
      if (cur) setAcademicYearId(cur.id);
    }
  }, [years, academicYearId]);

  useMemo(() => {
    if (!isStudent) return;
    if (classId) return;
    if (studentProfile?.classId) {
      setClassId(studentProfile.classId);
    }
  }, [isStudent, studentProfile, classId]);

  const { data: availableTeachers } = useQuery({
    queryKey: ['timetable', 'teachers', form.subjectId, classId, academicYearId],
    queryFn: async () => {
      if (!form.subjectId || !classId) return [];
      try {
        const res = await api.get('/teachers', {
          params: { limit: 100, classId, subjectId: form.subjectId, academicYearId },
        });
        return res.data?.data ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!form.subjectId && !!classId,
  });

  const createMut = useMutation({
    mutationFn: (dto: any) => timetableApi.create(dto),
    onSuccess: () => {
      toast.success('Créneau ajouté');
      qc.invalidateQueries({ queryKey: ['timetable', 'slots'] });
      setShowModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Conflit détecté'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => timetableApi.remove(id),
    onSuccess: () => {
      toast.success('Créneau supprimé');
      qc.invalidateQueries({ queryKey: ['timetable', 'slots'] });
    },
  });

  const grid = useMemo(() => {
    const g: Record<number, Record<number, any[]>> = {};
    for (const d of DAYS) {
      g[d.value] = {};
      for (const h of HOURS) g[d.value][h] = [];
    }
    for (const s of slots?.data ?? slots ?? []) {
      const h = dateToHour(s.startTime);
      if (g[s.dayOfWeek] && g[s.dayOfWeek][h]) g[s.dayOfWeek][h].push(s);
    }
    return g;
  }, [slots]);

  const submit = () => {
    if (!form.subjectId || !form.teacherId) {
      return toast.error('Matière et enseignant obligatoires');
    }
    const academicYear = years?.find((y: any) => y.id === academicYearId);
    if (!academicYear) return toast.error('Année scolaire requise');

    const pad = (n: number) => String(n).padStart(2, '0');
    const dto = {
      academicYearId,
      classId,
      subjectId: form.subjectId,
      teacherId: form.teacherId,
      roomId: form.roomId || null,
      dayOfWeek: form.dayOfWeek,
      startTime: `${pad(form.startHour)}:00`,
      endTime: `${pad(form.endHour)}:00`,
      weekPattern: form.weekPattern,
    };
    createMut.mutate(dto);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" /> Emploi du temps
        </h1>
        {canCreate && (
          <Button onClick={() => setShowModal(true)} disabled={!classId || !academicYearId}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau créneau
          </Button>
        )}
      </div>

      {!isStudent && (
        <Card className="p-4 flex gap-3">
          <select
            className="border rounded px-3 py-2 text-sm flex-1"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">— Choisir une classe —</option>
            {classes?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2 text-sm flex-1"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
          >
            <option value="">— Année scolaire —</option>
            {years?.map((y: any) => (
              <option key={y.id} value={y.id}>
                {y.label} {y.isCurrent ? '(actuelle)' : ''}
              </option>
            ))}
          </select>
        </Card>
      )}

      {isStudent && studentProfile?.className && (
        <Card className="p-4 text-sm text-slate-600">
          Ta classe : <strong>{studentProfile.className}</strong>
        </Card>
      )}

      {!classId || !academicYearId ? (
        <Card className="p-12 text-center text-gray-400">
          {isStudent ? 'Chargement de ton emploi du temps…' : 'Sélectionne une classe et une année pour afficher l\'emploi du temps.'}
        </Card>
      ) : isLoading ? (
        <Card className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 w-16">Heure</th>
                {DAYS.map((d) => (
                  <th key={d.value} className="border p-2">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((h) => (
                <tr key={h}>
                  <td className="border p-2 text-center font-mono bg-gray-50">
                    {formatTime(h)}
                  </td>
                  {DAYS.map((d) => {
                    const cellSlots = grid[d.value]?.[h] ?? [];
                    return (
                      <td
                        key={d.value}
                        className="border p-1 align-top h-16 hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          if (!canCreate) return;
                          if (cellSlots.length === 0) {
                            setForm({
                              subjectId: '', teacherId: '', roomId: '',
                              dayOfWeek: d.value, startHour: h, endHour: h + 1, weekPattern: 0,
                            });
                            setShowModal(true);
                          }
                        }}
                      >
                        {cellSlots.map((s: any) => (
                          <div
                            key={s.id}
                            className="bg-blue-100 text-blue-900 rounded p-1 mb-1 text-xs relative group"
                          >
                            <p className="font-semibold truncate">{s.subject?.name ?? '—'}</p>
                            <p className="truncate text-blue-700">
                              {s.teacher?.lastName ?? '—'}
                            </p>
                            {s.room && <p className="text-blue-600">{s.room.name}</p>}
                            {canDelete && (
                              <button
                                className="absolute top-0 right-0 p-0.5 opacity-0 group-hover:opacity-100 text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Supprimer ce créneau ?')) deleteMut.mutate(s.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showModal && canCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Nouveau créneau</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-sm text-gray-600">Matière *</label>
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
            <div>
              <label className="text-sm text-gray-600">Enseignant *</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">— Choisir —</option>
                {availableTeachers?.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Salle</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              >
                <option value="">— Aucune —</option>
                {rooms?.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Début</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.startHour}
                  onChange={(e) => setForm({ ...form, startHour: Number(e.target.value), endHour: Number(e.target.value) + 1 })}
                >
                  {HOURS.map((h) => <option key={h} value={h}>{formatTime(h)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Fin</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.endHour}
                  onChange={(e) => setForm({ ...form, endHour: Number(e.target.value) })}
                >
                  {HOURS.filter((h) => h > form.startHour).map((h) => (
                    <option key={h} value={h}>{formatTime(h)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button onClick={submit} disabled={createMut.isPending}>
                {createMut.isPending ? 'Enregistrement…' : 'Ajouter'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}