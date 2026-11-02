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
