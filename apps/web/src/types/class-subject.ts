export interface ClassSubject {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
  displayOrder: number;
  scale: 10 | 20;
  isMandatory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subject?: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
  };
  class?: {
    id: string;
    name: string;
    levelId?: string;
  };
  academicYear?: {
    id: string;
    label: string;
  };
  _count?: {
    assessments?: number;
    grades?: number;
  };
}

export interface ClassSubjectListFilters {
  classId?: string;
  academicYearId?: string;
  subjectId?: string;
  isActive?: boolean;
}

export interface CreateClassSubjectInput {
  classId: string;
  subjectId: string;
  academicYearId: string;
  displayOrder?: number;
  scale?: 10 | 20;
  isMandatory?: boolean;
  isActive?: boolean;
}

export interface UpdateClassSubjectInput {
  displayOrder?: number;
  scale?: 10 | 20;
  isMandatory?: boolean;
  isActive?: boolean;
}

export interface BulkCreateClassSubjectInput {
  classId: string;
  academicYearId: string;
  subjects: Array<{
    subjectId: string;
    displayOrder?: number;
    scale?: 10 | 20;
    isMandatory?: boolean;
  }>;
}

export interface ReorderClassSubjectInput {
  items: Array<{
    id: string;
    displayOrder: number;
  }>;
}
