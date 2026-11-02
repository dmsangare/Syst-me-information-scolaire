export interface SubjectDomain {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  order: number;
}

export interface Subject {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  description?: string | null;
  subjectDomainId?: string | null;
  subjectDomain?: SubjectDomain | null;
  type: "CORE" | "OPTIONAL" | "SPORT" | "ART";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  coefficients?: Array<{
    id: string;
    coefficient: number;
    weeklyHours?: number | null;
    academicYearId?: string | null;
    level: { id: string; code: string; name: string };
    academicYear?: { id: string; label: string } | null;
  }>;
  _count?: { assignments: number; assessments: number };
}

export interface CreateSubjectInput {
  schoolId?: string;
  code: string;
  name: string;
  description?: string | null;
  subjectDomainId?: string | null;
  type?: "CORE" | "OPTIONAL" | "SPORT" | "ART";
  isActive?: boolean;
}
