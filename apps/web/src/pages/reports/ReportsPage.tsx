import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  DollarSign,
  Users,
  GraduationCap,
  AlertCircle,
  TrendingUp,
  Award,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { reportsApi } from "@/api/reports";
import { formatCurrency } from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
  PageLoader,
} from "@/components/ui";
import { ExportMenu } from "@/components/export/ExportMenu";

// Palette SIS — couleurs distinctes et harmonieuses
const COLORS = [
  "#0e7490", // sis-brand (teal)
  "#ea580c", // orange
  "#7c3aed", // violet
  "#059669", // vert
  "#dc2626", // rouge
  "#0891b2", // cyan
  "#d97706", // ambre
  "#94a3b8", // neutral
];

const CATEGORY_LABELS: Record<string, string> = {
  INSCRIPTION: "Inscription",
  SCOLARITE: "Scolarité",
  CANTINE: "Cantine",
  TRANSPORT: "Transport",
  FOURNITURES: "Fournitures",
  AUTRE: "Autre",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  TRANSFER: "Virement",
  CHECK: "Chèque",
  MOBILE_MONEY: "Mobile Money",
  OTHER: "Autre",
};

type Tab =
  | "overview"
  | "financial"
  | "unpaid"
  | "students"
  | "pedagogical"
  | "attendance";

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
  { id: "financial", label: "Financier", icon: DollarSign },
  { id: "unpaid", label: "Impayés", icon: AlertCircle },
  { id: "students", label: "Effectifs", icon: Users },
  { id: "pedagogical", label: "Pédagogique", icon: GraduationCap },
  { id: "attendance", label: "Présences", icon: Calendar },
];

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const { data: overview, isLoading: l1 } = useQuery({
    queryKey: ["rpt", "overview"],
    queryFn: () => reportsApi.dashboard(),
  });
  const { data: financial, isLoading: l2 } = useQuery({
    queryKey: ["rpt", "financial"],
    queryFn: () => reportsApi.financial(),
    enabled: tab === "financial" || tab === "overview",
  });
  const { data: unpaid, isLoading: l3 } = useQuery({
    queryKey: ["rpt", "unpaid"],
    queryFn: () => reportsApi.unpaid(),
    enabled: tab === "unpaid",
  });
  const { data: students, isLoading: l4 } = useQuery({
    queryKey: ["rpt", "students"],
    queryFn: () => reportsApi.students(),
    enabled: tab === "students" || tab === "overview",
  });
  const { data: pedagogical, isLoading: l5 } = useQuery({
    queryKey: ["rpt", "pedagogical"],
    queryFn: () => reportsApi.pedagogical(),
    enabled: tab === "pedagogical",
  });
  const { data: attendance, isLoading: l6 } = useQuery({
    queryKey: ["rpt", "attendance"],
    queryFn: () => reportsApi.attendance(),
    enabled: tab === "attendance" || tab === "overview",
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-sis-md bg-sis-brand-50 text-sis-brand mt-0.5 dark:bg-sis-brand-900/30 dark:text-sis-brand-300">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyses et statistiques de votre établissement
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-1 border-b border-sis-neutral-200 dark:border-sis-neutral-800">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-sis-brand text-sis-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* ONGLET OVERVIEW */}
      {/* ============================================================ */}
      {tab === "overview" && (
        <div className="space-y-4">
          {l1 ? (
            <PageLoader label="Chargement..." />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Élèves"
                  value={overview?.studentsCount ?? 0}
                  hint={`${overview?.genderSplit?.boys ?? 0} G / ${overview?.genderSplit?.girls ?? 0} F`}
                  icon={<Users className="h-5 w-5" />}
                  accent="brand"
                />
                <KpiCard
                  label="Enseignants"
                  value={overview?.teachersCount ?? 0}
                  icon={<GraduationCap className="h-5 w-5" />}
                  accent="info"
                />
                <KpiCard
                  label="Classes"
                  value={overview?.classesCount ?? 0}
                  icon={<BarChart3 className="h-5 w-5" />}
                  accent="neutral"
                />
                <KpiCard
                  label="Taux de présence"
                  value={`${overview?.attendanceRate ?? 0} %`}
                  icon={<Calendar className="h-5 w-5" />}
                  accent="success"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Recettes"
                  value={formatCurrency(overview?.revenueAmount ?? 0)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  accent="success"
                />
                <KpiCard
                  label="Impayés"
                  value={formatCurrency(overview?.unpaidAmount ?? 0)}
                  icon={<AlertCircle className="h-5 w-5" />}
                  accent="danger"
                />
                <KpiCard
                  label="Total facturé"
                  value={formatCurrency(overview?.totalBilled ?? 0)}
                  icon={<DollarSign className="h-5 w-5" />}
                  accent="brand"
                />
                <KpiCard
                  label="Taux recouvrement"
                  value={`${
                    overview?.totalBilled
                      ? (
                          (overview.revenueAmount / overview.totalBilled) *
                          100
                        ).toFixed(1)
                      : 0
                  } %`}
                  icon={<Award className="h-5 w-5" />}
                  accent="info"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET FINANCIER */}
      {/* ============================================================ */}
      {tab === "financial" && (
        <div className="space-y-4">
          {l2 ? (
            <PageLoader label="Chargement..." />
          ) : (
            financial && (
              <>
                <div className="flex justify-end">
                  <ExportMenu
                    filename="rapport-financier"
                    csvRows={financial.byMonth ?? []}
                    excelSheets={[
                      { name: "Recettes par mois", rows: financial.byMonth ?? [] },
                      { name: "Par catégorie", rows: financial.byCategory ?? [] },
                      { name: "Par méthode", rows: financial.byMethod ?? [] },
                    ]}
                    pdfEndpoint="/reports/pdf/financial"
                    excelEndpoint="/reports/export/financial"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    label="Total facturé"
                    value={formatCurrency(financial.totalBilled)}
                    icon={<DollarSign className="h-5 w-5" />}
                    accent="brand"
                  />
                  <KpiCard
                    label="Encaissé"
                    value={formatCurrency(financial.totalPaid)}
                    icon={<TrendingUp className="h-5 w-5" />}
                    accent="success"
                  />
                  <KpiCard
                    label="Impayés"
                    value={formatCurrency(financial.totalUnpaid)}
                    icon={<AlertCircle className="h-5 w-5" />}
                    accent="danger"
                  />
                  <KpiCard
                    label="Taux recouvrement"
                    value={`${financial.recoveryRate.toFixed(1)} %`}
                    icon={<Award className="h-5 w-5" />}
                    accent="info"
                  />
                </div>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Recettes par mois
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={financial.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                          tickFormatter={(v) =>
                            v >= 1000000
                              ? `${(v / 1000000).toFixed(1)}M`
                              : v >= 1000
                                ? `${(v / 1000).toFixed(0)}K`
                                : v
                          }
                        />
                        <Tooltip
                          formatter={(v: any) => formatCurrency(v)}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          fill="#0e7490"
                          name="Recettes"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                    <CardHeader>
                      <CardTitle className="text-base">Par catégorie</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={financial.byCategory.map((c: any) => ({
                              name: CATEGORY_LABELS[c.category] ?? c.category,
                              value: c.amount,
                            }))}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={45}
                            outerRadius={80}
                            label
                          >
                            {financial.byCategory.map((_: any, i: number) => (
                              <Cell
                                key={i}
                                fill={COLORS[i % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any) => formatCurrency(v)} />
                          <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            wrapperStyle={{ fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                    <CardHeader>
                      <CardTitle className="text-base">Par méthode</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={(financial.byMethod ?? []).map((m: any) => ({
                              name: METHOD_LABELS[m.method] ?? m.method,
                              value: m.total,
                            }))}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={45}
                            outerRadius={80}
                            label
                          >
                            {(financial.byMethod ?? []).map(
                              (_: any, i: number) => (
                                <Cell
                                  key={i}
                                  fill={COLORS[(i + 2) % COLORS.length]}
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip formatter={(v: any) => formatCurrency(v)} />
                          <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            wrapperStyle={{ fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET IMPAYÉS */}
      {/* ============================================================ */}
      {tab === "unpaid" && (
        <div className="space-y-4">
          {l3 ? (
            <PageLoader label="Chargement..." />
          ) : (
            unpaid && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <KpiCard
                    label="Total impayés"
                    value={formatCurrency(unpaid.totalOutstanding)}
                    icon={<AlertCircle className="h-5 w-5" />}
                    accent="danger"
                  />
                  <KpiCard
                    label="Nombre de factures"
                    value={unpaid.count}
                    icon={<BarChart3 className="h-5 w-5" />}
                    accent="warning"
                  />
                </div>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Impayés par classe
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={unpaid.byClass}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="className" tick={{ fontSize: 12 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                        <Tooltip
                          formatter={(v: any) => formatCurrency(v)}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="total"
                          fill="#dc2626"
                          name="Impayés"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-base">
                      Détail ({unpaid.count})
                    </CardTitle>
                    <ExportMenu
                      filename="rapport-impayes"
                      csvRows={unpaid.items}
                      excelSheets={[
                        { name: "Détail impayés", rows: unpaid.items },
                        { name: "Par classe", rows: unpaid.byClass },
                      ]}
                      pdfEndpoint="/reports/pdf/unpaid"
                      excelEndpoint="/reports/export/unpaid"
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-sis-neutral-200 bg-sis-neutral-50 dark:border-sis-neutral-800 dark:bg-sis-neutral-900/60">
                          <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <th className="p-2">Facture</th>
                            <th className="p-2">Élève</th>
                            <th className="p-2">Classe</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 text-right">Payé</th>
                            <th className="p-2 text-right">Reste</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sis-neutral-200 dark:divide-sis-neutral-800">
                          {unpaid.items.slice(0, 50).map((i: any) => (
                            <tr
                              key={i.id}
                              className="hover:bg-sis-neutral-50/70 transition dark:hover:bg-sis-neutral-900/40"
                            >
                              <td className="p-2 font-mono text-xs">{i.number}</td>
                              <td className="p-2">{i.studentName}</td>
                              <td className="p-2">{i.className}</td>
                              <td className="p-2 text-right font-mono">
                                {formatCurrency(i.totalAmount)}
                              </td>
                              <td className="p-2 text-right text-sis-success font-mono">
                                {formatCurrency(i.paidAmount)}
                              </td>
                              <td className="p-2 text-right font-semibold text-sis-danger font-mono">
                                {formatCurrency(i.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET EFFECTIFS */}
      {/* ============================================================ */}
      {tab === "students" && (
        <div className="space-y-4">
          {l4 ? (
            <PageLoader label="Chargement..." />
          ) : (
            students && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard
                    label="Total élèves"
                    value={students.total}
                    icon={<Users className="h-5 w-5" />}
                    accent="brand"
                  />
                  <KpiCard
                    label="Garçons"
                    value={students.boys}
                    icon={<Users className="h-5 w-5" />}
                    accent="info"
                  />
                  <KpiCard
                    label="Filles"
                    value={students.girls}
                    icon={<Users className="h-5 w-5" />}
                    accent="warning"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Répartition par sexe
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Garçons", value: students.boys },
                              { name: "Filles", value: students.girls },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={45}
                            outerRadius={80}
                            label
                          >
                            <Cell fill="#0e7490" />
                            <Cell fill="#ea580c" />
                          </Pie>
                          <Tooltip />
                          <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            wrapperStyle={{ fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                    <CardHeader>
                      <CardTitle className="text-base">Par niveau</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={students.byLevel}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill="#0e7490"
                            name="Élèves"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                      Détail par classe
                    </CardTitle>
                    <ExportMenu
                      filename="rapport-effectifs"
                      csvRows={students.byClass}
                      excelSheets={[
                        { name: "Par classe", rows: students.byClass },
                        { name: "Par niveau", rows: students.byLevel },
                      ]}
                      pdfEndpoint="/reports/pdf/students"
                      excelEndpoint="/reports/export/students"
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-sis-neutral-200 bg-sis-neutral-50 dark:border-sis-neutral-800 dark:bg-sis-neutral-900/60">
                          <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <th className="p-2">Classe</th>
                            <th className="p-2">Niveau</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 text-right">G</th>
                            <th className="p-2 text-right">F</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sis-neutral-200 dark:divide-sis-neutral-800">
                          {students.byClass.map((c: any) => (
                            <tr
                              key={c.className}
                              className="hover:bg-sis-neutral-50/70 transition dark:hover:bg-sis-neutral-900/40"
                            >
                              <td className="p-2 font-medium">{c.className}</td>
                              <td className="p-2 text-muted-foreground">
                                {c.levelName}
                              </td>
                              <td className="p-2 text-right font-semibold">
                                {c.count}
                              </td>
                              <td className="p-2 text-right">{c.boys}</td>
                              <td className="p-2 text-right">{c.girls}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET PÉDAGOGIQUE */}
      {/* ============================================================ */}
      {tab === "pedagogical" && (
        <div className="space-y-4">
          {l5 ? (
            <PageLoader label="Chargement..." />
          ) : (
            pedagogical && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <KpiCard
                    label="Notes saisies"
                    value={pedagogical.totalGrades}
                    icon={<GraduationCap className="h-5 w-5" />}
                    accent="brand"
                  />
                  <KpiCard
                    label="Taux de réussite"
                    value={`${pedagogical.successRate.toFixed(1)} %`}
                    icon={<Award className="h-5 w-5" />}
                    accent="success"
                  />
                </div>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                      Moyennes par matière
                    </CardTitle>
                    <ExportMenu
                      filename="rapport-pedagogique"
                      csvRows={pedagogical.bySubject}
                      excelSheets={[
                        { name: "Par matière", rows: pedagogical.bySubject },
                        { name: "Par classe", rows: pedagogical.byClass },
                      ]}
                      pdfEndpoint="/reports/pdf/pedagogical"
                      excelEndpoint="/reports/export/pedagogical"
                    />
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={pedagogical.bySubject}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="code" tick={{ fontSize: 12 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                        <Tooltip
                          formatter={(v: any) => `${v} %`}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="avgPct"
                          fill="#7c3aed"
                          name="Moyenne %"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Détail par matière
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-sis-neutral-200 bg-sis-neutral-50 dark:border-sis-neutral-800 dark:bg-sis-neutral-900/60">
                          <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <th className="p-2">Matière</th>
                            <th className="p-2 text-right">Notes</th>
                            <th className="p-2 text-right">Moy.</th>
                            <th className="p-2 text-right">Min</th>
                            <th className="p-2 text-right">Max</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sis-neutral-200 dark:divide-sis-neutral-800">
                          {pedagogical.bySubject.map((s: any) => (
                            <tr
                              key={s.code}
                              className="hover:bg-sis-neutral-50/70 transition dark:hover:bg-sis-neutral-900/40"
                            >
                              <td className="p-2 font-medium">{s.subject}</td>
                              <td className="p-2 text-right">{s.count}</td>
                              <td className="p-2 text-right font-semibold">
                                {s.avgPct} %
                              </td>
                              <td className="p-2 text-right text-sis-danger">
                                {s.minPct} %
                              </td>
                              <td className="p-2 text-right text-sis-success">
                                {s.maxPct} %
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET PRÉSENCES */}
      {/* ============================================================ */}
      {tab === "attendance" && (
        <div className="space-y-4">
          {l6 ? (
            <PageLoader label="Chargement..." />
          ) : (
            attendance && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    label="Sessions"
                    value={attendance.sessionsCount}
                    icon={<Calendar className="h-5 w-5" />}
                    accent="brand"
                  />
                  <KpiCard
                    label="Présents"
                    value={attendance.present}
                    icon={<Users className="h-5 w-5" />}
                    accent="success"
                  />
                  <KpiCard
                    label="Absents"
                    value={attendance.absent}
                    icon={<AlertCircle className="h-5 w-5" />}
                    accent="danger"
                  />
                  <KpiCard
                    label="Taux de présence"
                    value={`${attendance.presenceRate} %`}
                    icon={<TrendingUp className="h-5 w-5" />}
                    accent={
                      attendance.presenceRate >= 90
                        ? "success"
                        : attendance.presenceRate >= 70
                          ? "warning"
                          : "danger"
                    }
                  />
                </div>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                      Taux de présence par classe
                    </CardTitle>
                    <ExportMenu
                      filename="rapport-presences"
                      csvRows={attendance.byClass}
                      excelSheets={[
                        { name: "Présences par classe", rows: attendance.byClass },
                      ]}
                      pdfEndpoint="/reports/pdf/attendance"
                      excelEndpoint="/reports/export/attendance"
                    />
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={attendance.byClass}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="className"
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                        <Tooltip
                          formatter={(v: any) => `${v} %`}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="presenceRate"
                          fill="#059669"
                          name="Taux %"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-sis-lg border-sis-neutral-200 shadow-sis-sm dark:border-sis-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Détail par classe
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-sis-neutral-200 bg-sis-neutral-50 dark:border-sis-neutral-800 dark:bg-sis-neutral-900/60">
                          <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <th className="p-2">Classe</th>
                            <th className="p-2 text-right">Sessions</th>
                            <th className="p-2 text-right">Présents</th>
                            <th className="p-2 text-right">Absents</th>
                            <th className="p-2 text-right">Retards</th>
                            <th className="p-2 text-right">Taux</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sis-neutral-200 dark:divide-sis-neutral-800">
                          {attendance.byClass.map((c: any) => (
                            <tr
                              key={c.className}
                              className="hover:bg-sis-neutral-50/70 transition dark:hover:bg-sis-neutral-900/40"
                            >
                              <td className="p-2 font-medium">{c.className}</td>
                              <td className="p-2 text-right">
                                {c.sessionsCount}
                              </td>
                              <td className="p-2 text-right text-sis-success">
                                {c.present}
                              </td>
                              <td className="p-2 text-right text-sis-danger">
                                {c.absent}
                              </td>
                              <td className="p-2 text-right text-sis-warning">
                                {c.late}
                              </td>
                              <td className="p-2 text-right font-semibold">
                                {c.presenceRate} %
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}