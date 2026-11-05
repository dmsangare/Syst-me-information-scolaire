import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreatePaymentModal } from "./components/CreatePaymentModal";
import { InstallmentsList } from "./components/InstallmentsList";
import {
  ArrowLeft,
  Loader2,
  Receipt,
  Ban,
  FileText,
  Wallet,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useInvoice, useInvoiceInstallments, useCancelInvoice } from "@/hooks/finance";
import {
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatFCFA,
  type InvoiceInstallment,
} from "@/types/finance";

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: installments } = useInvoiceInstallments(id);
  const cancelMutation = useCancelInvoice();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<InvoiceInstallment | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">Facture introuvable</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/invoices">Retour aux factures</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = INVOICE_STATUS_LABELS[invoice.status] || INVOICE_STATUS_LABELS.UNPAID;
  const canCancel = invoice.status !== "CANCELLED" && invoice.status !== "PAID";

  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) return;
    await cancelMutation.mutateAsync({
      id,
      dto: { reason: cancelReason.trim() },
    });
    setShowCancelModal(false);
    setCancelReason("");
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* HEADER */}
      <div>
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux factures
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {invoice.number}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                {invoice.student && (
                  <span className="font-medium text-foreground">
                    {invoice.student.lastName} {invoice.student.firstName}
                  </span>
                )}
                {invoice.student?.matricule && (
                  <span className="font-mono text-xs">
                    {invoice.student.matricule}
                  </span>
                )}
                {invoice.issuedAt && (
                  <span>
                    · Émise le{" "}
                    {new Date(invoice.issuedAt).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <span
            className={cn(
              "inline-block px-3 py-1.5 rounded text-sm font-medium",
              statusInfo.color,
            )}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total facturé"
          value={formatFCFA(invoice.totalAmount)}
          icon={<Receipt className="h-4 w-4" />}
          color="text-blue-600"
        />
        <StatCard
          label="Encaissé"
          value={formatFCFA(invoice.paidAmount)}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-green-600"
        />
        <StatCard
          label="Solde restant"
          value={formatFCFA(invoice.balance)}
          icon={<AlertCircle className="h-4 w-4" />}
          color={Number(invoice.balance) > 0 ? "text-red-600" : "text-green-600"}
        />
        <StatCard
          label="Nb paiements"
          value={String(invoice.payments?.length || 0)}
          icon={<FileText className="h-4 w-4" />}
          color="text-purple-600"
        />
      </div>

      {/* ECHEANCIER */}
      {installments && installments.length > 0 && (
        <InstallmentsList
          installments={installments}
          onPayInstallment={(inst) => {
            setSelectedInstallment(inst);
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* DETAIL ITEMS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ðŸ“‹ Détail des frais</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!invoice.items || invoice.items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Aucun frais dans cette facture
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">Frais</th>
                    <th className="text-center p-3 font-medium w-20">Qté</th>
                    <th className="text-right p-3 font-medium w-32">P.U.</th>
                    <th className="text-right p-3 font-medium w-32">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium">
                          {item.feeType?.name || item.description || "—"}
                        </div>
                        {item.description && item.feeType && (
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatFCFA(item.unitAmount)}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {formatFCFA(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40 font-bold">
                    <td className="p-3" colSpan={3}>
                      TOTAL
                    </td>
                    <td className="p-3 text-right font-mono text-base">
                      {formatFCFA(invoice.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PAIEMENTS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ðŸ’° Paiements enregistrés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!invoice.payments || invoice.payments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Aucun paiement enregistré
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Méthode</th>
                    <th className="text-left p-3 font-medium">Référence</th>
                    <th className="text-right p-3 font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p: any) => {
                    const methodInfo =
                      PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ||
                      PAYMENT_METHOD_LABELS.CASH;
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-3 text-muted-foreground text-xs">
                          {new Date(p.paidAt).toLocaleString("fr-FR")}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
                              methodInfo.color,
                            )}
                          >
                            <span>{methodInfo.emoji}</span>
                            {methodInfo.label}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {p.reference || "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-green-600">
                          {formatFCFA(p.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium">Enregistrer un paiement</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajoutez un encaissement pour cette facture.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPaymentModal(true)}
            disabled={
              Number(invoice.balance) <= 0 || invoice.status === "CANCELLED"
            }
            className="bg-green-600 hover:bg-green-700"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Enregistrer un paiement
          </Button>
        </CardContent>
      </Card>

      {canCancel && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-medium">Annuler cette facture</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cette action marquera la facture comme annulée.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelModal(true)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Annuler la facture
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MODALE PAIEMENT */}
      {showPaymentModal && id && (
        <CreatePaymentModal
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInstallment(null);
          }}
          preselectedInvoiceId={id}
          preselectedInstallmentId={selectedInstallment?.id}
        />
      )}

      {/* MODALE ANNULATION */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Annuler la facture</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Veuillez indiquer la raison.
                  </p>
                </div>
              </div>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Élève parti, erreur de saisie..."
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                maxLength={300}
              />
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
              >
                {cancelMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirmer l'annulation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}
          {label}
        </div>
        <div className={cn("text-lg font-bold font-mono", color)}>{value}</div>
      </CardContent>
    </Card>
  );
}
