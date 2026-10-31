/**
 * SIS-MALI â€” SchÃ©mas Zod partagÃ©s (validation API + formulaires)
 */

import { z } from 'zod';
import {
  Gender,
  SchoolType,
  SchoolStatus,
  AcademicYearStatus,
  TermType,
  LevelCycle,
  ClassStatus,
  RoomType,
  StudentStatus,
  GuardianRelation,
  EnrollmentStatus,
  TeacherStatus,
  ContractType,
  SubjectType,
  AttendanceStatus,
  AssessmentType,
  AssessmentStatus,
  ReportDecision,
  ReportStatus,
  ExamType,
  ExamStatus,
  FeeCategory,
  InvoiceStatus,
  PaymentMethod,
  CashStatus,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  BackupType,
} from './enums';

// ============================================================
// UTILITAIRES
// ============================================================

const uuid = z.string().uuid('Identifiant UUID invalide');
const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ requis');
const phoneML = z
  .string()
  .regex(/^(\+223)?[2-9]\d{7}$/, 'NumÃ©ro malien invalide (ex: +223 70 00 00 00)');
const nonEmptyString = (min = 1, message = 'Champ obligatoire') =>
  z.string().min(min, message);

// ============================================================
// PAGINATION
// ============================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  sort: z.string().optional(),
  q: z.string().optional(),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// ============================================================
// AUTH
// ============================================================

export const LoginSchema = z.object({
  identifier: nonEmptyString(3, 'Email ou tÃ©lÃ©phone requis'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractÃ¨res'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z
      .string()
      .min(12, 'Le nouveau mot de passe doit contenir au moins 12 caractÃ¨res')
      .regex(/[A-Z]/, 'Doit contenir une majuscule')
      .regex(/[a-z]/, 'Doit contenir une minuscule')
      .regex(/\d/, 'Doit contenir un chiffre')
      .regex(/[^A-Za-z0-9]/, 'Doit contenir un caractÃ¨re spÃ©cial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ============================================================
// SCHOOL
// ============================================================

export const SchoolCreateSchema = z.object({
  code: nonEmptyString(2).max(20),
  sigle: z.string().max(20).optional().or(z.literal('')),
  name: nonEmptyString(3).max(150),
  type: z.nativeEnum(SchoolType),
  status: z.nativeEnum(SchoolStatus),
  address: z.string().optional(),
  region: z.string().max(100).optional(),
  cercle: z.string().max(100).optional(),
  commune: z.string().max(100).optional(),
  quarter: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  directorName: z.string().max(150).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  motto: z.string().max(200).optional(),
  createdYear: z.coerce.number().int().min(1900).max(2100).optional(),
  tutelleInfo: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const SchoolUpdateSchema = SchoolCreateSchema.partial();

export type SchoolCreateInput = z.infer<typeof SchoolCreateSchema>;
export type SchoolUpdateInput = z.infer<typeof SchoolUpdateSchema>;

// ============================================================
// ACADEMIC YEAR
// ============================================================

const AcademicYearCreateBaseSchema = z.object({
  schoolId: uuid,
  label: z.string().regex(/^\d{4}-\d{4}$/, 'Format AAAA-AAAA requis (ex: 2026-2027)'),
  startDate: dateISO,
  endDate: dateISO,
  status: z.nativeEnum(AcademicYearStatus).default(AcademicYearStatus.PREPARATION),
  isCurrent: z.boolean().default(false),
});

export const AcademicYearCreateSchema = AcademicYearCreateBaseSchema.refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'La date de fin doit etre posterieure a la date de debut',
    path: ['endDate'],
  },
);

export const AcademicYearUpdateSchema = AcademicYearCreateBaseSchema.partial();

export type AcademicYearCreateInput = z.infer<typeof AcademicYearCreateSchema>;
export type AcademicYearUpdateInput = z.infer<typeof AcademicYearUpdateSchema>;

// ============================================================
// TERM
// ============================================================

export const TermCreateSchema = z.object({
  academicYearId: uuid,
  name: nonEmptyString(2).max(50),
  type: z.nativeEnum(TermType),
  startDate: dateISO,
  endDate: dateISO,
  orderIndex: z.coerce.number().int().min(1).max(10),
  isLocked: z.boolean().default(false),
});

export const TermUpdateSchema = TermCreateSchema.partial();

export type TermCreateInput = z.infer<typeof TermCreateSchema>;
export type TermUpdateInput = z.infer<typeof TermUpdateSchema>;

// ============================================================
// LEVEL
// ============================================================

export const LevelCreateSchema = z.object({
  schoolId: uuid,
  cycle: z.nativeEnum(LevelCycle),
  name: nonEmptyString(2).max(50),
  code: nonEmptyString(1).max(20),
  orderIndex: z.coerce.number().int().min(1).max(50),
  isActive: z.boolean().default(true),
});

export const LevelUpdateSchema = LevelCreateSchema.partial();

export type LevelCreateInput = z.infer<typeof LevelCreateSchema>;
export type LevelUpdateInput = z.infer<typeof LevelUpdateSchema>;

// ============================================================
// ROOM
// ============================================================

export const RoomCreateSchema = z.object({
  schoolId: uuid,
  name: nonEmptyString(2).max(80),
  type: z.nativeEnum(RoomType),
  capacity: z.coerce.number().int().positive().max(1000).optional(),
  location: z.string().max(120).optional(),
  equipment: z.record(z.string(), z.any()).optional(),
  isAvailable: z.boolean().default(true),
});

export const RoomUpdateSchema = RoomCreateSchema.partial();

export type RoomCreateInput = z.infer<typeof RoomCreateSchema>;
export type RoomUpdateInput = z.infer<typeof RoomUpdateSchema>;

// ============================================================
// CLASS
// ============================================================

export const ClassCreateSchema = z.object({
  schoolId: uuid.optional(),
  academicYearId: uuid,
  levelId: uuid,
  code: nonEmptyString(1).max(30),
  name: nonEmptyString(2).max(100),
  roomId: uuid.optional().nullable(),
  capacity: z.coerce.number().int().positive().max(500).optional(),
  mainTeacherId: uuid.optional().nullable(),
  status: z.nativeEnum(ClassStatus).default(ClassStatus.OPEN),
});

export const ClassUpdateSchema = ClassCreateSchema.partial();

export type ClassCreateInput = z.infer<typeof ClassCreateSchema>;
export type ClassUpdateInput = z.infer<typeof ClassUpdateSchema>;

// ============================================================
// STUDENT
// ============================================================

export const StudentCreateSchema = z.object({
  schoolId: uuid,
  firstName: nonEmptyString(2, 'Le prÃ©nom est requis (min. 2 caractÃ¨res)').max(100),
  lastName: nonEmptyString(2, 'Le nom de famille est requis (min. 2 caractÃ¨res)').max(100),
  gender: z.nativeEnum(Gender),
  birthDate: dateISO,
  birthPlace: z.string().max(150).optional(),
  nationality: z.string().max(80).default('Malienne'),
  photoUrl: z.string().url().optional().or(z.literal('')),
  phone: phoneML.optional().or(z.literal('')),
  address: z.string().optional(),
  specialSituation: z.string().optional(),
  status: z.nativeEnum(StudentStatus).default(StudentStatus.ACTIVE),
});

export const StudentUpdateSchema = StudentCreateSchema.partial();

export type StudentCreateInput = z.infer<typeof StudentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof StudentUpdateSchema>;

// ============================================================
// GUARDIAN
// ============================================================

export const GuardianCreateSchema = z.object({
  schoolId: uuid,
  userId: uuid.optional().nullable(),
  firstName: nonEmptyString(2).max(100),
  lastName: nonEmptyString(2).max(100),
  gender: z.nativeEnum(Gender).optional(),
  phone: phoneML,
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  profession: z.string().max(120).optional(),
  relationType: z.nativeEnum(GuardianRelation),
});

export const GuardianUpdateSchema = GuardianCreateSchema.partial();

export type GuardianCreateInput = z.infer<typeof GuardianCreateSchema>;
export type GuardianUpdateInput = z.infer<typeof GuardianUpdateSchema>;

// ============================================================
// ENROLLMENT
// ============================================================

export const EnrollmentCreateSchema = z.object({
  studentId: uuid,
  academicYearId: uuid,
  classId: uuid,
  levelId: uuid,
  enrollmentDate: dateISO.optional(),
  status: z.nativeEnum(EnrollmentStatus).default(EnrollmentStatus.PENDING),
  previousSchool: z.string().max(200).optional(),
  notes: z.string().optional(),
});

export const EnrollmentUpdateSchema = EnrollmentCreateSchema.partial();

export type EnrollmentCreateInput = z.infer<typeof EnrollmentCreateSchema>;
export type EnrollmentUpdateInput = z.infer<typeof EnrollmentUpdateSchema>;

// ============================================================
// TEACHER
// ============================================================

export const TeacherCreateSchema = z.object({
  schoolId: uuid,
  userId: uuid.optional().nullable(),
  matricule: nonEmptyString(2).max(30),
  firstName: nonEmptyString(2).max(100),
  lastName: nonEmptyString(2).max(100),
  gender: z.nativeEnum(Gender).optional(),
  phone: phoneML.optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  specialty: z.string().max(120).optional(),
  diploma: z.string().max(150).optional(),
  hireDate: dateISO.optional(),
  status: z.nativeEnum(TeacherStatus).default(TeacherStatus.ACTIVE),
  contractType: z.nativeEnum(ContractType).optional(),
});

export const TeacherUpdateSchema = TeacherCreateSchema.partial();

export type TeacherCreateInput = z.infer<typeof TeacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof TeacherUpdateSchema>;

// ============================================================
// SUBJECT
// ============================================================

export const SubjectCreateSchema = z.object({
  schoolId: uuid.optional(),
  code: nonEmptyString(1).max(20),
  name: nonEmptyString(2).max(120),
  type: z.nativeEnum(SubjectType).default(SubjectType.CORE),
  isActive: z.boolean().default(true),
});

export const SubjectUpdateSchema = SubjectCreateSchema.partial();

export type SubjectCreateInput = z.infer<typeof SubjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof SubjectUpdateSchema>;

// ============================================================
// SUBJECT COEFFICIENT
// ============================================================

export const SubjectCoefficientCreateSchema = z.object({
  subjectId: uuid,
  levelId: uuid,
  coefficient: z.coerce.number().positive().max(20),
  weeklyHours: z.coerce.number().positive().max(40).optional(),
});

export const SubjectCoefficientUpdateSchema = SubjectCoefficientCreateSchema.partial();

export type SubjectCoefficientCreateInput = z.infer<typeof SubjectCoefficientCreateSchema>;
export type SubjectCoefficientUpdateInput = z.infer<typeof SubjectCoefficientUpdateSchema>;

// ============================================================
// TEACHER ASSIGNMENT
// ============================================================

export const TeacherAssignmentCreateSchema = z.object({
  teacherId: uuid,
  subjectId: uuid,
  classId: uuid,
  academicYearId: uuid,
  isMain: z.boolean().default(false),
});

export type TeacherAssignmentCreateInput = z.infer<typeof TeacherAssignmentCreateSchema>;

// ============================================================
// TIMETABLE SLOT
// ============================================================

const TimetableSlotCreateBaseSchema = z.object({
  schoolId: uuid.optional(),
  academicYearId: uuid,
  classId: uuid,
  subjectId: uuid,
  teacherId: uuid,
  roomId: uuid.optional().nullable(),
  dayOfWeek: z.coerce.number().int().min(1).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  weekPattern: z.coerce.number().int().min(0).max(3).default(0),
});

export const TimetableSlotCreateSchema = TimetableSlotCreateBaseSchema.refine(
  (data) => data.endTime > data.startTime,
  {
    message: "L'heure de fin doit etre posterieure a l'heure de debut",
    path: ['endTime'],
  },
);

export const TimetableSlotUpdateSchema = TimetableSlotCreateBaseSchema.partial();

export type TimetableSlotCreateInput = z.infer<typeof TimetableSlotCreateSchema>;
export type TimetableSlotUpdateInput = z.infer<typeof TimetableSlotUpdateSchema>;

// ============================================================
// ATTENDANCE
// ============================================================

export const AttendanceRecordSchema = z.object({
  studentId: uuid,
  status: z.nativeEnum(AttendanceStatus),
  justification: z.string().optional(),
});

export const AttendanceSessionCreateSchema = z.object({
  classId: uuid,
  subjectId: uuid.optional().nullable(),
  teacherId: uuid,
  termId: uuid,
  date: dateISO,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  records: z.array(AttendanceRecordSchema).min(1, 'Au moins un enregistrement est requis'),
});

export const AttendanceBulkUpdateSchema = z.object({
  sessionId: uuid,
  records: z.array(AttendanceRecordSchema),
});

export type AttendanceRecordInput = z.infer<typeof AttendanceRecordSchema>;
export type AttendanceSessionCreateInput = z.infer<typeof AttendanceSessionCreateSchema>;
export type AttendanceBulkUpdateInput = z.infer<typeof AttendanceBulkUpdateSchema>;

// ============================================================
// ASSESSMENT
// ============================================================

export const AssessmentCreateSchema = z.object({
  schoolId: uuid.optional(),
  academicYearId: uuid,
  termId: uuid,
  classId: uuid,
  subjectId: uuid,
  teacherId: uuid,
  type: z.nativeEnum(AssessmentType),
  title: nonEmptyString(3, 'Titre requis (ex: Devoir nÂ°1)').max(150),
  date: dateISO,
  maxScore: z.coerce.number().positive().max(100).default(20),
  coefficient: z.coerce.number().positive().max(10).default(1),
  durationMin: z.coerce.number().int().positive().max(300).optional(),
  status: z.nativeEnum(AssessmentStatus).default(AssessmentStatus.DRAFT),
  observation: z.string().optional(),
});

export const AssessmentUpdateSchema = AssessmentCreateSchema.partial();

export type AssessmentCreateInput = z.infer<typeof AssessmentCreateSchema>;
export type AssessmentUpdateInput = z.infer<typeof AssessmentUpdateSchema>;

// ============================================================
// GRADES
// ============================================================

export const GradeEntrySchema = z.object({
  studentId: uuid,
  value: z.coerce.number().min(0).max(100).nullable(),
  status: z.enum(["PRESENT", "ABSENT", "EXEMPT", "MISSING"]).default("PRESENT"),
  isAbsent: z.boolean().default(false),
  isExempt: z.boolean().default(false),
  observation: z.string().optional(),
  comment: z.string().optional(),
});

export const GradesBulkSchema = z.object({
  assessmentId: uuid,
  grades: z.array(GradeEntrySchema).min(1),
});

export const GradeUpdateSchema = z.object({
  value: z.coerce.number().min(0).max(100).nullable().optional(),
  status: z.enum(["PRESENT", "ABSENT", "EXEMPT", "MISSING"]).optional(),
  isAbsent: z.boolean().optional(),
  isExempt: z.boolean().optional(),
  observation: z.string().optional(),
  comment: z.string().optional(),
});

export type GradeEntryInput = z.infer<typeof GradeEntrySchema>;
export type GradesBulkInput = z.infer<typeof GradesBulkSchema>;
export type GradeUpdateInput = z.infer<typeof GradeUpdateSchema>;

// ============================================================
// REPORT CARD
// ============================================================

export const ReportCardGenerateSchema = z.object({
  academicYearId: uuid,
  termId: uuid,
  classId: uuid.optional(),
  studentId: uuid.optional(),
  kind: z.enum(["COMPOSITION", "TRIMESTRIEL", "ANNUEL"]).optional().default("TRIMESTRIEL"),
});

export const ReportCardUpdateSchema = z.object({
  decision: z.nativeEnum(ReportDecision).optional(),
  appreciation: z.string().optional(),
  conductScore: z.number().min(0).max(20).nullable().optional(),
  conductAppreciation: z.string().optional(),
});

export type ReportCardGenerateInput = z.infer<typeof ReportCardGenerateSchema>;
export type ReportCardUpdateInput = z.infer<typeof ReportCardUpdateSchema>;

export const ReportCardReopenSchema = z.object({
  motive: z.string().min(5, 'Motif obligatoire (min 5 caractÃ¨res)').max(500),
});
export type ReportCardReopenInput = z.infer<typeof ReportCardReopenSchema>;

// ============================================================
// EXAM
// ============================================================

const ExamCreateBaseSchema = z.object({
  schoolId: uuid,
  academicYearId: uuid,
  termId: uuid.optional().nullable(),
  type: z.nativeEnum(ExamType),
  name: nonEmptyString(3).max(150),
  startDate: dateISO,
  endDate: dateISO,
  status: z.nativeEnum(ExamStatus).default(ExamStatus.PLANNED),
});

export const ExamCreateSchema = ExamCreateBaseSchema.refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'La date de fin doit etre posterieure ou egale a la date de debut',
    path: ['endDate'],
  },
);

export const ExamUpdateSchema = ExamCreateBaseSchema.partial();

export const ExamSessionCreateSchema = z.object({
  examId: uuid,
  subjectId: uuid,
  classId: uuid,
  roomId: uuid.optional().nullable(),
  supervisorId: uuid.optional().nullable(),
  date: dateISO,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
});

export type ExamCreateInput = z.infer<typeof ExamCreateSchema>;
export type ExamUpdateInput = z.infer<typeof ExamUpdateSchema>;
export type ExamSessionCreateInput = z.infer<typeof ExamSessionCreateSchema>;

// ============================================================
// FEE
// ============================================================

export const FeeTypeCreateSchema = z.object({
  schoolId: uuid,
  code: nonEmptyString(1).max(30),
  name: nonEmptyString(2).max(120),
  category: z.nativeEnum(FeeCategory),
  isActive: z.boolean().default(true),
});

export const FeeStructureCreateSchema = z.object({
  schoolId: uuid,
  academicYearId: uuid,
  levelId: uuid.optional().nullable(),
  feeTypeId: uuid,
  amount: z.coerce.number().nonnegative(),
  dueDate: dateISO.optional(),
  installments: z.coerce.number().int().positive().max(12).default(1),
});

export type FeeTypeCreateInput = z.infer<typeof FeeTypeCreateSchema>;
export type FeeStructureCreateInput = z.infer<typeof FeeStructureCreateSchema>;

// ============================================================
// INVOICE
// ============================================================

export const InvoiceCreateSchema = z.object({
  schoolId: uuid,
  studentId: uuid,
  academicYearId: uuid,
  dueDate: dateISO.optional(),
  items: z
    .array(
      z.object({
        feeTypeId: uuid,
        description: z.string().max(200).optional(),
        quantity: z.coerce.number().int().positive().default(1),
        unitAmount: z.coerce.number().nonnegative(),
      }),
    )
    .min(1, 'Au moins un article requis'),
});

export const InvoiceCancelSchema = z.object({
  reason: z.string().min(5, 'Motif requis'),
});

export type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>;
export type InvoiceCancelInput = z.infer<typeof InvoiceCancelSchema>;

// ============================================================
// PAYMENT
// ============================================================

export const PaymentCreateSchema = z.object({
  schoolId: uuid.optional(),
  invoiceId: uuid,
  studentId: uuid,
  amount: z.coerce.number().positive('Le montant doit Ãªtre supÃ©rieur Ã  0'),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().max(80).optional(),
  cashierId: uuid.optional(),

  /** Autoriser un paiement > solde du (surplus va en credit eleve) */
  allowOverpayment: z.boolean().optional().default(false),

  /** Cle d'idempotence : si la meme cle est envoyee 2 fois, on ne cree qu'un paiement */
  idempotencyKey: z.string().max(80).optional(),
});

export const PaymentCancelSchema = z.object({
  reason: z.string().min(5, 'Motif requis'),
});

/**
 * Encaissement famille : un seul montant reparti en FIFO
 * sur toutes les factures non soldees des enfants du tuteur.
 */
export const PaymentFamilySchema = z.object({
  guardianId: uuid,
  amount: z.coerce.number().positive('Le montant doit Ãªtre supÃ©rieur Ã  0'),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().max(80).optional(),
  idempotencyKey: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>;
export type PaymentCancelInput = z.infer<typeof PaymentCancelSchema>;
export type PaymentFamilyInput = z.infer<typeof PaymentFamilySchema>;

// ============================================================
// CASH SESSION
// ============================================================

export const CashSessionOpenSchema = z.object({
  schoolId: uuid,
  cashierId: uuid,
  openingAmount: z.coerce.number().nonnegative().default(0),
});

export const CashSessionCloseSchema = z.object({
  closingAmount: z.coerce.number().nonnegative(),
});

export type CashSessionOpenInput = z.infer<typeof CashSessionOpenSchema>;
export type CashSessionCloseInput = z.infer<typeof CashSessionCloseSchema>;

// ============================================================
// NOTIFICATION
// ============================================================

export const NotificationCreateSchema = z.object({
  schoolId: uuid,
  userId: uuid.optional().nullable(),
  guardianId: uuid.optional().nullable(),
  type: z.nativeEnum(NotificationType),
  title: nonEmptyString(2).max(150),
  body: nonEmptyString(2),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.INTERNAL),
  status: z.nativeEnum(NotificationStatus).default(NotificationStatus.PENDING),
  payload: z.record(z.string(), z.any()).optional(),
});

export const NotificationBulkSchema = z.object({
  schoolId: uuid,
  recipientIds: z.array(uuid).min(1),
  type: z.nativeEnum(NotificationType),
  title: nonEmptyString(2).max(150),
  body: nonEmptyString(2),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.INTERNAL),
});

export type NotificationCreateInput = z.infer<typeof NotificationCreateSchema>;
export type NotificationBulkInput = z.infer<typeof NotificationBulkSchema>;

// ============================================================
// BACKUP
// ============================================================

export const BackupCreateSchema = z.object({
  schoolId: uuid.optional().nullable(),
  type: z.nativeEnum(BackupType),
});

export type BackupCreateInput = z.infer<typeof BackupCreateSchema>;

// ============================================================
// USER
// ============================================================

export const UserCreateSchema = z.object({
  schoolId: uuid.optional().nullable(),
  email: z.string().email().optional().or(z.literal('')),
  phone: phoneML.optional().or(z.literal('')),
  password: z
    .string()
    .min(12, 'Au moins 12 caractÃ¨res')
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[a-z]/, 'Doit contenir une minuscule')
    .regex(/\d/, 'Doit contenir un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Doit contenir un caractÃ¨re spÃ©cial'),
  firstName: nonEmptyString(2).max(100),
  lastName: nonEmptyString(2).max(100),
  roleIds: z.array(uuid).min(1, 'Au moins un rÃ´le requis'),
});

export const UserUpdateSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: phoneML.optional().or(z.literal('')),
  firstName: nonEmptyString(2).max(100).optional(),
  lastName: nonEmptyString(2).max(100).optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  roleIds: z.array(uuid).optional(),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

// ============================================================
// RECHERCHE GLOBALE
// ============================================================

export const GlobalSearchSchema = z.object({
  q: z.string().min(2, 'Au moins 2 caractÃ¨res'),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type GlobalSearchInput = z.infer<typeof GlobalSearchSchema>;
// ============================================================
// BACKUP â€” Configuration sauvegarde automatique
// ============================================================

export const BackupRetentionSchema = z.object({
  daily: z.coerce.number().int().min(1).max(365).default(7),
  weekly: z.coerce.number().int().min(0).max(52).default(4),
  monthly: z.coerce.number().int().min(0).max(120).default(12),
});

export const BackupSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  cron: z
    .string()
    .regex(
      /^(\*|[0-5]?\d)(\s+(\*|[01]?\d|2[0-3]))(\s+(\*|[0-2]?\d|3[01]))(\s+(\*|[0-1]?\d))(\s+(\*|[0-7]))$/,
      "Format cron invalide (ex: '0 23 * * *' pour 23h00 tous les jours)"
    )
    .default("0 23 * * *"),
  includeFiles: z.boolean().default(true),
  retention: BackupRetentionSchema.default({ daily: 7, weekly: 4, monthly: 12 }),
  lastRun: z.string().datetime().nullable().optional(),
  lastStatus: z.enum(["SUCCESS", "FAILED", "IN_PROGRESS"]).nullable().optional(),
  nextRun: z.string().datetime().nullable().optional(),
});

export const BackupSettingsUpdateSchema = BackupSettingsSchema.partial().omit({
  lastRun: true,
  lastStatus: true,
  nextRun: true,
});

export type BackupSettings = z.infer<typeof BackupSettingsSchema>;
export type BackupSettingsUpdate = z.infer<typeof BackupSettingsUpdateSchema>;
export type BackupRetention = z.infer<typeof BackupRetentionSchema>;