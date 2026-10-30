import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { UserThrottlerGuard } from "./common/guards"; // ou depuis './common/guards/user-throttler.guard'
import configuration from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { RolesModule } from "./roles/roles.module";
import { UsersModule } from "./users/users.module";
import { SchoolsModule } from "./schools/schools.module";
import { AcademicYearsModule } from "./academic-years/academic-years.module";
import { TermsModule } from "./terms/terms.module";
import { LevelsModule } from "./levels/levels.module";
import { RoomsModule } from "./rooms/rooms.module";
import { ClassesModule } from "./classes/classes.module";
import { SettingsModule } from "./settings/settings.module";
import { StudentsModule } from "./students/students.module";
import { GuardiansModule } from "./guardians/guardians.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { TeachersModule } from "./teachers/teachers.module";
import { SubjectsModule } from "./subjects/subjects.module";
import { TeacherAssignmentsModule } from "./teacher-assignments/teacher-assignments.module";
import { TimetableModule } from "./timetable/timetable.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AssessmentsModule } from "./assessments/assessments.module";
import { GradesModule } from "./grades/grades.module";
import { ReportCardsModule } from "./report-cards/report-cards.module";
import { SubjectDomainsModule } from "./subject-domains/subject-domains.module";
import { AnnualDecisionsModule } from "./annual-decisions/annual-decisions.module";
import { ExamsModule } from "./exams/exams.module";
import { FeeTypesModule } from "./fee-types/fee-types.module";
import { FeeStructuresModule } from "./fee-structures/fee-structures.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { MessagesModule } from "./messages/messages.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ExpenseCategoriesModule } from "./expense-categories/expense-categories.module";
import { PaymentsModule } from "./payments/payments.module";
import { ReceiptsModule } from "./receipts/receipts.module";
import { CashSessionsModule } from "./cash-sessions/cash-sessions.module";
import { DocumentsModule } from "./documents/documents.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { VerificationModule } from "./verification/verification.module";
import { YearRolloverModule } from "./year-rollover/year-rollover.module";
import { FinanceClosureModule } from "./finance-closure/finance-closure.module";
import { StateExamsModule } from "./state-exams/state-exams.module";
import { ReportsModule } from "./reports/reports.module";
import { AuditModule } from "./audit/audit.module";
import { BackupsModule } from "./backups/backups.module";
import { TransfersModule } from "./transfers/transfers.module";
import { AdminReportsModule } from "./admin-reports/admin-reports.module";
import { StateExamDossiersModule } from "./state-exam-dossiers/state-exam-dossiers.module";
import { ExportModule } from "./export/export.module";

import { JwtAuthGuard, PermissionsGuard, MustChangePasswordGuard } from "./common/guards";
import { AuditInterceptor, TransformInterceptor } from "./common/interceptors";
import { HealthModule } from "./health/health.module";
import { SystemLogsModule } from "./system-logs/system-logs.module";
import { StudentAccountsModule } from "./student-accounts/student-accounts.module";
import { FilesModule } from "./files/files.module";

@Module({
  imports: [
    HealthModule,
    FilesModule,
    SystemLogsModule,
    StudentAccountsModule,
    RolesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env", "../../.env"],
      cache: true,
    }),
        ThrottlerModule.forRoot([
      // Throttler global : 50 000 requêtes / heure (quasi illimité pour un utilisateur normal)
      // L'objectif est de bloquer les attaques DDoS, pas de gêner le travail des comptables.
      { name: "default", ttl: 60 * 60_000, limit: 50000 },
      
      // Throttler "auth" : STRICT. 5 tentatives / 15 min (anti brute force login).
      // C'est la seule vraie porte d'entrée sensible.
      { name: "auth", ttl: 15 * 60_000, limit: 5 },
      
      // Throttler "verify" : 30 verifications / min (anti enumeration QR)
      { name: "verify", ttl: 60_000, limit: 30 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    AcademicYearsModule,
    TermsModule,
    LevelsModule,
    RoomsModule,
    ClassesModule,
    SettingsModule,
    StudentsModule,
    GuardiansModule,
    EnrollmentsModule,
    TeachersModule,
    SubjectsModule,
    TeacherAssignmentsModule,
    TimetableModule,
    AttendanceModule,
    AssessmentsModule,
    GradesModule,
    ReportCardsModule,
    SubjectDomainsModule,
    AnnualDecisionsModule,
    ExamsModule,
    FeeTypesModule,
    FeeStructuresModule,
    InvoicesModule,
    ExpensesModule,
    MessagesModule,
    DashboardModule,
    ExpenseCategoriesModule,
    PaymentsModule,
    ReceiptsModule,
    CashSessionsModule,
    DocumentsModule,
    NotificationsModule,
    VerificationModule,
    YearRolloverModule,
    FinanceClosureModule,
    StateExamsModule,
    ReportsModule,
    AuditModule,
    BackupsModule,
    TransfersModule,
    AdminReportsModule,
    StateExamDossiersModule,
    ExportModule,
  ],
  providers: [
  { provide: APP_GUARD, useClass: UserThrottlerGuard }, // ✅ Remplacé
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: MustChangePasswordGuard },
  { provide: APP_GUARD, useClass: PermissionsGuard },
],
})
export class AppModule {}
