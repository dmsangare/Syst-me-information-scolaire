export interface SubjectCoefficient {
  id: string;
  subjectId: string;
  levelId: string;
  academicYearId: string;
  coefficient: number;
  weeklyHours: number | null;
  createdAt: string;
  updatedAt: string;
  subject?: {
    id: string;
    code: string;
    name: string;
  };
  level?: {
    id: string;
    name: string;
    cycle: string;
  };
  academicYear?: {
    id: string;
    label: string;
    isCurrent: boolean;
  };
}

export interface SetCoefficientInput {
  levelId: string;
  academicYearId: string;
  coefficient: number;
  weeklyHours?: number;
}

export interface SubjectCoefficientMatrixRow {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  coefficient: number | null;
  weeklyHours: number | null;
  existingId: string | null;
}

// === Historique (D2) ===
export type CoefficientOperationType = "CREATE" | "UPDATE" | "DELETE";

export interface CoefficientAuditUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface CoefficientAudit {
  id: string;
  coefficientId: string | null;
  subjectId: string;
  levelId: string;
  academicYearId: string;
  oldValue: number | string | null;
  newValue: number | string | null;
  oldWeeklyHours: number | string | null;
  newWeeklyHours: number | string | null;
  operationType: CoefficientOperationType;
  userId: string;
  motive: string | null;
  createdAt: string;
  user: CoefficientAuditUser;
}

export interface CoefficientAuditFilters {
  levelId?: string;
  academicYearId?: string;
}