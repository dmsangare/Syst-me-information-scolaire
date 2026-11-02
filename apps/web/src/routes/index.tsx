import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ChangePasswordRequiredPage } from "@/pages/auth/ChangePasswordRequiredPage";
import { InitSchoolPage } from "@/pages/init-school/InitSchoolPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { HonorRollPage } from "@/pages/honor-roll/HonorRollPage";
import { AdminReportsListPage } from "@/pages/admin-reports/AdminReportsListPage";
import { AdminReportsPage } from "@/pages/admin-reports/AdminReportsPage";
import { AdminReportNewPage } from "@/pages/admin-reports/AdminReportNewPage";
import { AdminReportDetailPage } from "@/pages/admin-reports/AdminReportDetailPage";
import { AdminReportsDashboardPage } from "@/pages/admin-reports/AdminReportsDashboardPage";
import { AdminReportsDeadlinesPage } from "@/pages/admin-reports/AdminReportsDeadlinesPage";
import { AdminReportsArchivesPage } from "@/pages/admin-reports/AdminReportsArchivesPage";
import { StateExamSessionsPage } from "@/pages/state-exam-dossiers/StateExamSessionsPage";
import { StateExamSessionDetailPage } from "@/pages/state-exam-dossiers/StateExamSessionDetailPage";
import { StateExamDossierDetailPage } from "@/pages/state-exam-dossiers/StateExamDossierDetailPage";
import { StudentsListPage } from "@/pages/students/StudentsListPage";
import { StudentDetailPage } from "@/pages/students/StudentDetailPage";
import { StudentFormPage } from "@/pages/students/StudentFormPage";
import { ImportStudentsPage } from "@/pages/students/ImportStudentsPage";
import { ClassesListPage, ClassDetailPage } from "@/pages/classes";
import { TeachersListPage, TeacherFormPage, TeacherDetailPage } from "@/pages/teachers";
import { SubjectsListPage, SubjectFormPage } from "@/pages/subjects";
import ClassSubjectsPage from "@/pages/class-subjects/ClassSubjectsPage";
import CoefficientsPage from "@/pages/coefficients/CoefficientsPage";
import { LevelsListPage } from "@/pages/levels/LevelsListPage";
import { AttendanceListPage, AttendanceDetailPage } from "@/pages/attendance";
import { AssessmentsListPage, AssessmentGradesPage } from "@/pages/assessments";
import { ReportCardsListPage, ReportCardDetailPage } from "@/pages/report-cards";
import { CalculationPage } from "@/pages/report-cards/CalculationPage";
import { AnnualResultsPage } from "@/pages/report-cards/AnnualResultsPage";
import { AnnualDecisionsPage } from "@/pages/annual-decisions/AnnualDecisionsPage"; // Ã¢Å“â€¦ NOUVEL IMPORT
import {
  InvoicesListPage,
  InvoiceDetailPage,
  PaymentDetailPage,
  PaymentsListPage,
  CashSessionsListPage,
  FeeTypesListPage,
  FeeStructuresListPage,
  ExpensesListPage,
  RemindersListPage,
  ImportSituationPage,
  FinanceDashboardPage,
  PointDeCaissePage,
  FacturationPage,
  EncaissementPage,
  RecouvrementPage,
  ConfigurationFinancePage,
} from "@/pages/finance";
import { ExamsListPage, ExamDetailPage } from "@/pages/exams";
import { ReportsPage } from "@/pages/reports";
import { SettingsPage } from "@/pages/settings";
import { IdCardsPage } from "@/pages/id-cards/IdCardsPage";
import { AcademicYearsPage } from "@/pages/academic-years/AcademicYearsPage";
import { YearRolloverPage } from "@/pages/year-rollover/YearRolloverPage";
import { StateExamsPage } from "@/pages/state-exams/StateExamsPage";
import { BatchGradesEntryPage } from "@/pages/grades/BatchGradesEntryPage";
import TimetablePage from '@/pages/timetable/TimetablePage';
import { PublicVerificationPage } from '@/pages/public/PublicVerificationPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          path="/change-password-required"
          element={<ChangePasswordRequiredPage />}
        />
        <Route path="/init-school" element={<InitSchoolPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/honor-roll" element={<HonorRollPage />} />

          {/* Ãƒâ€°lÃƒÂ¨ves */}
          <Route
            path="/students"
            element={
              <ProtectedRoute requiredPermission="student:view">
                <StudentsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/new"
            element={
              <ProtectedRoute requiredPermission="student:create">
                <StudentFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/import"
            element={
              <ProtectedRoute requiredPermission="student:create">
                <ImportStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute requiredPermission="student:view">
                <StudentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id/edit"
            element={
              <ProtectedRoute requiredPermission="student:update">
                <StudentFormPage />
              </ProtectedRoute>
            }
          />

          {/* Classes */}
          <Route
            path="/classes"
            element={
              <ProtectedRoute requiredPermission="class:view">
                <ClassesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes/:id"
            element={
              <ProtectedRoute requiredPermission="class:view">
                <ClassDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Enseignants */}
          <Route
            path="/teachers"
            element={
              <ProtectedRoute requiredPermission="teacher:view">
                <TeachersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers/new"
            element={
              <ProtectedRoute requiredPermission="teacher:create">
                <TeacherFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers/:id/edit"
            element={
              <ProtectedRoute requiredPermission="teacher:update">
                <TeacherFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers/:id"
            element={
              <ProtectedRoute requiredPermission="teacher:view">
                <TeacherDetailPage />
              </ProtectedRoute>
            }
          />

          {/* MatiÃƒÂ¨res */}
          <Route
            path="/subjects"
            element={
              <ProtectedRoute requiredPermission="subject:view">
                <SubjectsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/new"
            element={
              <ProtectedRoute requiredPermission="subject:create">
                <SubjectFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id/edit"
            element={
              <ProtectedRoute requiredPermission="subject:update">
                <SubjectFormPage />
              </ProtectedRoute>
            }
          />

          {/* Niveaux */}
          <Route
            path="/levels"
            element={
              <ProtectedRoute requiredPermission="level:view">
                <LevelsListPage />
              </ProtectedRoute>
            }
          />

          {/* PrÃƒÂ©sences */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute requiredPermission="attendance:view">
                <AttendanceListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/:id"
            element={
              <ProtectedRoute requiredPermission="attendance:view">
                <AttendanceDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Notes / Evaluations */}
          <Route
            path="/assessments"
            element={
              <ProtectedRoute requiredPermission="grade:view">
                <AssessmentsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments/:id/grades"
            element={
              <ProtectedRoute requiredPermission="grade:view">
                <AssessmentGradesPage />
              </ProtectedRoute>
            }
          />

          {/* Bulletins */}
          <Route
            path="/report-cards"
            element={
              <ProtectedRoute requiredPermission="report_card:view">
                <ReportCardsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-cards/:id"
            element={
              <ProtectedRoute requiredPermission="report_card:view">
                <ReportCardDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/annual-results"
            element={
              <ProtectedRoute requiredPermission="report_card:view">
                <AnnualResultsPage />
              </ProtectedRoute>
            }
          />

          {/* Ã¢Å“â€¦ DÃƒÂ©cisions annuelles */}
          <Route
            path="/annual-decisions"
            element={
              <ProtectedRoute requiredPermission="report_card:view">
                <AnnualDecisionsPage />
              </ProtectedRoute>
            }
          />

          {/* Finances */}
          <Route
            path="/finance/dashboard"
            element={
              <ProtectedRoute requiredPermission="invoice:view">
                <FinanceDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/point-de-caisse"
            element={
              <ProtectedRoute requiredPermission="payment:create">
                <PointDeCaissePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/facturation"
            element={
              <ProtectedRoute requiredPermission="invoice:view">
                <FacturationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/encaissement"
            element={
              <ProtectedRoute requiredPermission="payment:view">
                <EncaissementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/recouvrement"
            element={
              <ProtectedRoute requiredPermission="invoice:view">
                <RecouvrementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration"
            element={
              <ProtectedRoute requiredPermission="fee:view">
                <ConfigurationFinancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fee-types"
            element={
              <ProtectedRoute requiredPermission="fee:view">
                <FeeTypesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fee-structures"
            element={
              <ProtectedRoute requiredPermission="fee:view">
                <FeeStructuresListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute requiredPermission="invoice:view">
                <InvoicesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute requiredPermission="invoice:view">
                <InvoiceDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/import-situation"
            element={
              <ProtectedRoute requiredPermission="invoice:create">
                <ImportSituationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute requiredPermission="payment:view">
                <PaymentsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/:id"
            element={
              <ProtectedRoute requiredPermission="payment:view">
                <PaymentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute requiredPermission="expense:view">
                <ExpensesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reminders"
            element={
              <ProtectedRoute requiredPermission="invoice:view">
                <RemindersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash-sessions"
            element={
              <ProtectedRoute requiredPermission="cash:view">
                <CashSessionsListPage />
              </ProtectedRoute>
            }
          />

          {/* Examens */}
          <Route
            path="/exams"
            element={
              <ProtectedRoute requiredPermission="exam:view">
                <ExamsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/:id"
            element={
              <ProtectedRoute requiredPermission="exam:view">
                <ExamDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Rapports */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermission="report:view">
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Emploi du temps */}
          <Route
            path="/timetable"
            element={
              <ProtectedRoute requiredPermission="timetable:view">
                <TimetablePage />
              </ProtectedRoute>
            }
          />

          {/* ParamÃƒÂ¨tres */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPermission="settings:view">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

            <Route
              path="/class-subjects"
              element={
                <ProtectedRoute requiredPermission="subject:view">
                  <ClassSubjectsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/coefficients"
              element={
                <ProtectedRoute requiredPermission="subject:view">
                  <CoefficientsPage />
                </ProtectedRoute>
              }
            />
        <Route
          path="/report-cards/calculation"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <CalculationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/id-cards"
          element={
            <ProtectedRoute requiredPermission="student:view">
              <IdCardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic-years"
          element={
            <ProtectedRoute requiredPermission="academic_year:view">
              <AcademicYearsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/year-rollover"
          element={
            <ProtectedRoute requiredPermission="academic_year:create">
              <YearRolloverPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/state-exams"
          element={
            <ProtectedRoute requiredPermission="academic_year:view">
              <StateExamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-reports"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <AdminReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-reports/dashboard"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <AdminReportsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-reports/deadlines"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <AdminReportsDeadlinesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-reports/new"
          element={
            <ProtectedRoute requiredPermission="report_card:create">
              <AdminReportNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-reports/:id"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <AdminReportDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-reports/archives"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <AdminReportsArchivesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/state-exam-dossiers"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <StateExamSessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/state-exam-dossiers/sessions/:id"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <StateExamSessionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/state-exam-dossiers/dossiers/:id"
          element={
            <ProtectedRoute requiredPermission="report_card:view">
              <StateExamDossierDetailPage />
            </ProtectedRoute>
          }
        />
              <Route path="/grades/batch" element={<BatchGradesEntryPage />} />
</Route>

      <Route path="/v/:shortCode" element={<PublicVerificationPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
