import { Link } from "react-router-dom";
import {
  Receipt,
  Wallet,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Coins,
  Layers,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { useFinanceDashboard } from "@/hooks/finance";
import { useCurrentAcademicYear } from "@/hooks/classes/useClasses";
import { CoverageWarning } from "./components/CoverageWarning";
import { formatFCFA } from "@/types/finance";
import { cn } from "@/lib/utils";

export function FinanceDashboardPage() {
  const { data, isLoading, error } = useFinanceDashboard();
  const { data: currentYear } = useCurrentAcademicYear();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
      <CoverageWarning academicYearId={currentYear?.id} />
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Impossible de charger le tableau de bord financier.
          </CardContent>
        </Card>
      </div>
    );
  }

  const recoveryRate =
    data.totalBilled > 0 ? (data.totalPaid / data.totalBilled) * 100 : 0;

  const recoveryColor =
    recoveryRate >= 80
      ? "text-green-600"
      : recoveryRate >= 50
      ? "text-yellow-600"
      : "text-red-600";

  const recoveryBarColor =
    recoveryRate >= 80
      ? "bg-green-500"
      : recoveryRate >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  const pendingCount = data.partialCount + data.unpaidCount + data.overdueCount;

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord financier</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d'ensemble de la situation financière de l'établissement
        </p>
      </div>

      {/* Cartes principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Total facturé
              </span>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {formatFCFA(data.totalBilled)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.invoicesCount} facture{data.invoicesCount > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Total encaissé
              </span>
              <Wallet className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatFCFA(data.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.paidCount} facture{data.paidCount > 1 ? "s" : ""} soldée
              {data.paidCount > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Reste à recouvrer
              </span>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatFCFA(data.totalUnpaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount} facture{pendingCount > 1 ? "s" : ""} en attente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Taux de recouvrement */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Taux de recouvrement</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className={cn("text-3xl font-bold", recoveryColor)}>
              {recoveryRate.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">
              {formatFCFA(data.totalPaid)} / {formatFCFA(data.totalBilled)}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full transition-all", recoveryBarColor)}
              style={{ width: `${Math.min(recoveryRate, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Répartition par statut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          icon={CheckCircle2}
          label="Soldées"
          count={data.paidCount}
          total={data.invoicesCount}
          color="text-green-600"
          barColor="bg-green-500"
        />
        <StatusCard
          icon={Clock}
          label="Partielles"
          count={data.partialCount}
          total={data.invoicesCount}
          color="text-yellow-600"
          barColor="bg-yellow-500"
        />
        <StatusCard
          icon={AlertTriangle}
          label="Impayées"
          count={data.unpaidCount + data.overdueCount}
          total={data.invoicesCount}
          color="text-red-600"
          barColor="bg-red-500"
        />
      </div>

      {/* Raccourcis */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <span className="font-medium">Raccourcis</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink
              to="/finance/facturation?tab=invoices"
              icon={Receipt}
              label="Voir les factures"
            />
            <QuickLink
              to="/finance/point-de-caisse"
              icon={Coins}
              label="Point de caisse"
            />
            <QuickLink
              to="/finance/recouvrement?tab=impayes"
              icon={AlertTriangle}
              label="Voir les impayés"
            />
            <QuickLink
              to="/finance/recouvrement?tab=echeances"
              icon={Layers}
              label="Voir les échéances"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Sous-composants
// ============================================================

interface StatusCardProps {
  icon: LucideIcon;
  label: string;
  count: number;
  total: number;
  color: string;
  barColor: string;
}

function StatusCard({
  icon: Icon,
  label,
  count,
  total,
  color,
  barColor,
}: StatusCardProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className={cn("text-2xl font-bold", color)}>{count}</div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {pct.toFixed(0)}% du total
        </p>
      </CardContent>
    </Card>
  );
}

interface QuickLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

function QuickLink({ to, icon: Icon, label }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md border p-3 text-sm font-medium hover:bg-accent transition-colors"
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}