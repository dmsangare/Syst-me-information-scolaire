import { NavLink } from "react-router-dom";
import {
  PieChart,
  LayoutDashboard,
  Trophy,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  Award,
  TrendingUp,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  School,
  UsersRound,
  CreditCard,
  Layers,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/hooks/school/useSchool";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  indent?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "GÃ©nÃ©ral",
    items: [
      { label: "Tableau de bord", to: "/dashboard", icon: LayoutDashboard },
      { label: "Tableau d'honneur", to: "/honor-roll", icon: Trophy },
    ],
  },
  {
    title: "ScolaritÃ©",
    items: [
      { label: "Ã‰lÃ¨ves", to: "/students", icon: Users, permission: "student:view" },
      { label: "Niveaux", to: "/levels", icon: Layers, permission: "level:view" },
      { label: "Classes", to: "/classes", icon: School, permission: "class:view" },
      { label: "Enseignants", to: "/teachers", icon: UsersRound, permission: "teacher:view" },
      { label: "MatiÃ¨res", to: "/subjects", icon: BookOpen, permission: "subject:view" },
      { label: "Affectation matieres", to: "/class-subjects", icon: Layers, permission: "subject:view" },
    ],
  },
  {
    title: "PÃ©dagogie",
    items: [
      { label: "Emploi du temps", to: "/timetable", icon: Calendar, permission: "timetable:view" },
      { label: "PrÃ©sences", to: "/attendance", icon: ClipboardCheck, permission: "attendance:view" },
      { label: "Notes", to: "/assessments", icon: FileText, permission: "grade:view" },
      { label: "Saisie groupee", to: "/grades/batch", icon: ClipboardCheck, permission: "grade:create" },
      { label: "Bulletins", to: "/report-cards", icon: Award, permission: "report_card:view" },
      { label: "RÃ©sultats annuels", to: "/annual-results", icon: TrendingUp, permission: "report_card:view" },
      { label: "DÃ©cisions annuelles", to: "/annual-decisions", icon: CheckCircle2, permission: "report_card:view" },
    ],
  },
  {
    title: "Examens",
    items: [
      { label: "Examens", to: "/exams", icon: GraduationCap, permission: "exam:view" },
    ],
  },
  {
    title: "Finances",
    items: [
      { label: "Tableau de bord", to: "/finance/dashboard", icon: PieChart, permission: "invoice:view" },
      { label: "Facturation", to: "/finance/facturation", icon: Receipt, permission: "invoice:view" },
      { label: "Encaissement", to: "/finance/encaissement", icon: Wallet, permission: "payment:view" },
      { label: "Recouvrement", to: "/finance/recouvrement", icon: AlertTriangle, permission: "invoice:view" },
      { label: "DÃ©penses", to: "/expenses", icon: TrendingDown, permission: "expense:view" },
      { label: "Configuration", to: "/finance/configuration", icon: Settings, permission: "fee:view" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Cartes scolaires", to: "/id-cards", icon: CreditCard, permission: "student:view" },
    ],
  },
  {
    title: "SystÃ¨me",
    items: [
      { label: "AnnÃ©es scolaires", to: "/academic-years", icon: Calendar, permission: "academic_year:view" },
      { label: "Passage d'annÃ©e", to: "/year-rollover", icon: GraduationCap, permission: "academic_year:create" },
      { label: "Examens d'Ã‰tat", to: "/state-exams", icon: Award, permission: "academic_year:view" },
      { label: "Rapports administratifs", to: "/admin-reports", icon: FileText, permission: "report_card:view" },
      { label: "Rapports", to: "/reports", icon: BarChart3, permission: "report:view" },
      { label: "ParamÃ¨tres", to: "/settings", icon: Settings, permission: "settings:view" },
    ],
  },
];

export function Sidebar() {
  const { hasPermission } = useAuth();
  const { data: school } = useSchool();

  const hasLogo = !!school?.logoUrl;
  const schoolName = school?.name || "SIS-MALI";
  const sigle = school?.sigle || "S";

  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.permission || hasPermission(item.permission),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <aside className="flex w-64 flex-col border-r border-sis-neutral-200 bg-card h-screen dark:border-sis-neutral-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sis-neutral-200 px-6 dark:border-sis-neutral-800">
        {hasLogo ? (
          <img
            src={school!.logoUrl!}
            alt={schoolName}
            className="h-8 w-8 rounded-sis-sm object-contain shrink-0"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-sis-sm bg-sis-brand text-sis-brand-foreground font-bold shrink-0">
            {sigle.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span
            className="text-sm font-bold leading-none truncate"
            title={schoolName}
          >
            {schoolName}
          </span>
          <span className="text-xs text-muted-foreground leading-none mt-0.5">
            Gestion scolaire
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-sis-sm py-2 text-sm font-medium transition-colors",
                        item.indent ? "pl-9 pr-3" : "px-3",
                        isActive
                          ? "bg-sis-brand text-sis-brand-foreground shadow-sis-sm"
                          : "text-muted-foreground hover:bg-sis-brand-50 hover:text-sis-brand dark:hover:bg-sis-brand-900/20 dark:hover:text-sis-brand-300",
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sis-neutral-200 p-3 dark:border-sis-neutral-800">
        <p className="text-xs text-muted-foreground text-center">
          SIS-MALI v1.0
        </p>
      </div>
    </aside>
  );
}
