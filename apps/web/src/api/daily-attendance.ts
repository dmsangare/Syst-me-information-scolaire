import { api } from "@/lib/axios";

export interface DailyAttendanceClassStatus {
  classId: string;
  className: string;
  levelName: string | null;
  cycle: string | null;
  totalStudents: number;
  sessionId: string | null;
  status: "TODO" | "DONE" | "IN_PROGRESS";
  presentCount: number;
  absentCount: number;
  lateCount: number;
  createdAt: string | null;
}

export interface DailyAttendanceClassesResponse {
  date: string;
  classes: DailyAttendanceClassStatus[];
}

export interface DailyAttendanceRecord {
  id: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED";
  observation: string | null;
  justificationStatus: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    gender: string;
    photoUrl: string | null;
  };
}

export interface DailyAttendanceSession {
  id: string;
  classId: string;
  date: string;
  createdAt: string;
  records: DailyAttendanceRecord[];
  createdByUser: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string };
}

export interface DailyAttendanceStats {
  date: string;
  expected: number;
  present: number;
  absent: number;
  late: number;
  justified: number;
  unjustified: number;
  pending: number;
  rate: number;
}

export const dailyAttendanceApi = {
  async getClassesStatus(date?: string): Promise<DailyAttendanceClassesResponse> {
    const { data } = await api.get("/attendance/daily/classes", {
      params: date ? { date } : {},
    });
    return data;
  },

  async getByClass(classId: string, date?: string): Promise<DailyAttendanceSession | null> {
    const { data } = await api.get(`/attendance/daily/class/${classId}`, {
      params: date ? { date } : {},
    });
    return data;
  },

  async create(dto: {
    classId: string;
    date: string;
    records: Array<{ studentId: string; status: string; observation?: string }>;
  }): Promise<DailyAttendanceSession> {
    const { data } = await api.post("/attendance/daily", dto);
    return data;
  },

  async updateRecord(recordId: string, dto: { status: string; observation?: string; reason?: string }) {
    const { data } = await api.patch(`/attendance/daily/records/${recordId}`, dto);
    return data;
  },

  async getDayStats(date?: string): Promise<DailyAttendanceStats> {
    const { data } = await api.get("/attendance/daily/stats", {
      params: date ? { date } : {},
    });
    return data;
  },
};

export interface StudentAttendanceSummary {
  student: { id: string; firstName: string; lastName: string; matricule: string } | null;
  academicYear: { id: string; label: string };
  stats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    justifiedDays: number;
    unjustifiedDays: number;
    pendingDays: number;
    maxConsecutiveAbsences: number;
    lastAbsenceDate: string | null;
    rate: number;
  };
}

export interface StudentAttendanceHistory {
  academicYear: { id: string; label: string };
  history: Array<{
    id: string;
    date: string;
    className: string | null;
    status: string;
    justificationStatus: string | null;
    justificationReason: string | null;
    justifiedAt: string | null;
    justifiedBy: string | null;
    observation: string | null;
  }>;
}

export const attendanceStudentApi = {
  async justifyRecord(recordId: string, dto: { decision: "ACCEPTED" | "REJECTED"; reason: string; observation?: string }) {
    const { data } = await api.post(`/attendance/daily/records/${recordId}/justify`, dto);
    return data;
  },
  async getStudentSummary(studentId: string, academicYearId?: string): Promise<StudentAttendanceSummary> {
    const { data } = await api.get(`/attendance/student/${studentId}/summary`, {
      params: academicYearId ? { academicYearId } : {},
    });
    return data;
  },
  async getStudentHistory(studentId: string, academicYearId?: string): Promise<StudentAttendanceHistory> {
    const { data } = await api.get(`/attendance/student/${studentId}/history`, {
      params: academicYearId ? { academicYearId } : {},
    });
    return data;
  },
};
