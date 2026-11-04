export type TeacherType = "GENERALIST" | "SPECIALIST";

export interface TeacherSpecialty {
  id: string;
  teacherId: string;
  subjectId: string;
  isMain: boolean;
  createdAt: string;
  subject: { id: string; code: string; name: string };
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId?: string | null;
  matricule: string;
  firstName: string;
  lastName: string;
  teacherType: TeacherType;
  gender?: "M" | "F" | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  specialty?: string | null;
  diploma?: string | null;
  hireDate?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  contractType?: string | null;
  createdAt: string;
  updatedAt: string;
  assignments?: Array<{
    id: string;
    subject: { id: string; code: string; name: string } | null;
    class: { id: string; code?: string; name: string };
    academicYear?: { id: string; label: string };
    isMain: boolean;
  }>;
  specialties?: TeacherSpecialty[];
  _count?: {
    assignments: number;
    timetableSlots: number;
    mainTeacherClasses: number;
  };
}

export interface CreateTeacherInput {
  schoolId?: string;
  matricule?: string;
  firstName: string;
  lastName: string;
  teacherType?: TeacherType;
  gender?: "M" | "F";
  phone?: string;
  email?: string;
  address?: string;
  specialty?: string;
  diploma?: string;
  hireDate?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  contractType?: "PERMANENT" | "CONTRACT" | "TEMPORARY" | "VOLUNTEER";
}