export type AssessmentType =
  | "INTERROGATION"
  | "DEVOIR"
  | "CONTROLE"
  | "COMPOSITION"
  | "EXAMEN"
  | "TP"
  | "ORAL"
  | "PROJET";

export type AssessmentStatus =
  | "DRAFT"
  | "OPEN"
  | "SUBMITTED"
  | "VALIDATED"
  | "LOCKED";

export interface Assessment {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  type: AssessmentType;
  title: string;
  date: string;
  maxScore: number;
  coefficient: number;
  durationMin?: number | null;
  status: AssessmentStatus;
  observation?: string | null;
  class?: { id: string; code: string; name: string };
  subject?: { id: string; code: string; name: string };
  teacher?: { id: string; firstName: string; lastName: string };
  term?: { id: string; name: string };
  _count?: { grades: number };
}

export interface StudentGrade {
  studentId: string;
  student: {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
    gender: "M" | "F";
  };
  grade: {
    id: string;
    value: number | null;
    isAbsent: boolean;
    observation?: string | null;
    locked: boolean;
  } | null;
}

export interface AssessmentGrades {
  assessment: Assessment;
  grades: StudentGrade[];
}

export interface CreateAssessmentInput {
  schoolId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  type: AssessmentType;
  title: string;
  date: string;
  maxScore?: number;
  coefficient?: number;
  durationMin?: number;
  observation?: string;
}

export interface GradeEntry {
  studentId: string;
  value: number | null;
  isAbsent?: boolean;
  observation?: string;
}

export interface ReportCard {
  id: string;
  studentId: string;
  classId: string;
  termId: string;
  academicYearId: string;
  average: number | null;
  rank: number | null;
  classSize: number | null;
  decision: string | null;
  appreciation?: string | null;
  absencesCount: number;
  latesCount: number;
  status: "DRAFT" | "VALIDATED" | "PUBLISHED";
  publishedAt?: string | null;
  pdfUrl?: string | null;
  student?: {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
  };
  class?: { id: string; code: string; name: string };
  term?: { id: string; name: string };
  items?: Array<{
    id: string;
    subjectId: string;
    average: number | null;
    coefficient: number;
    weighted: number | null;
    rank: number | null;
    teacherComment?: string | null;
    subject: { id: string; code: string; name: string };
  }>;
}

// ============================================================
// SAISIE GROUPEE (MATRICE ELEVES x MATIERES)
// ============================================================

export interface MatrixSubject {
  id: string;
  code: string;
  name: string;
  scale: number;
  displayOrder: number;
  isMandatory: boolean;
}

export interface MatrixCell {
  subjectId: string;
  assessmentId: string | null;
  value: number | null;
  isAbsent: boolean;
  isExempt: boolean;
  observation: string | null;
}

export interface MatrixStudent {
  studentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: "M" | "F";
  cells: MatrixCell[];
}

export interface MatrixClassInfo {
  id: string;
  code: string;
  name: string;
}

export interface MatrixTermInfo {
  id: string;
  name: string;
  type: string;
  isLocked: boolean;
}

export interface MatrixAcademicYearInfo {
  id: string;
  label: string;
}

export interface MatrixStats {
  totalStudents: number;
  totalSubjects: number;
  totalCells: number;
}

export interface MatrixResponse {
  class: MatrixClassInfo;
  term: MatrixTermInfo;
  academicYear: MatrixAcademicYearInfo;
  cycle: string;
  scale: number;
  assessmentType: string;
  subjects: MatrixSubject[];
  students: Array<{
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
  }>;
  matrix: MatrixStudent[];
  stats: MatrixStats;
}

export interface BatchMatrixEntry {
  studentId: string;
  subjectId: string;
  value: number | null;
  isAbsent: boolean;
  isExempt: boolean;
  observation?: string | null;
}

export interface BatchMatrixPayload {
  classId: string;
  termId: string;
  assessmentType: string;
  entries: BatchMatrixEntry[];
  overwrite: boolean;
}

export interface BatchMatrixConflict {
  studentId: string;
  subjectId: string;
  currentValue: number;
}

export interface BatchMatrixResult {
  created: number;
  updated: number;
  skipped: number;
  conflicts: BatchMatrixConflict[];
  totalProcessed: number;
  termName: string;
  scale: number;
}
