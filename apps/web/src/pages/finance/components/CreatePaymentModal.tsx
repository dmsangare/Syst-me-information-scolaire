import { useState, useMemo, useEffect } from "react";
import {
  X,
  Loader2,
  Wallet,
  AlertCircle,
  Search,
  Check,
  User,
  Receipt,
  ChevronRight,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useCreatePayment } from "@/hooks/finance";
import {
  PAYMENT_METHOD_LABELS,
  formatFCFA,
  type PaymentMethod,
  type Invoice,
} from "@/types/finance";
import { StudentPicker } from "./StudentPicker";

interface Props {
  onClose: () => void;
  preselectedInvoiceId?: string;
  preselectedInstallmentId?: string;
}

interface StudentLite {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
}

const METHODS: PaymentMethod[] = [
  "CASH",
  "MOBILE_MONEY",
  "TRANSFER",
  "CHECK",
  "OTHER",
];

export function CreatePaymentModal({
  onClose,
  preselectedInvoiceId,
  preselectedInstallmentId,
}: Props) {
  const [student, setStudent] = useState<StudentLite | null>(null);
  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId || "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [installmentId, setInstallmentId] = useState<string | undefined>(
    preselectedInstallmentId,
  );

  const createMutation = useCreatePayment();
  const qc = useQueryClient();

  // Charger les factures impayees de l'eleve
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices", "student", student?.id],
    queryFn: async () => {
      const { data } = await api.get("/invoices", {
        params: { studentId: student!.id, limit: 50 },
      });
      return (data.data?.items || data.data || []) as Invoice[];
    },
    enabled: !!student?.id,
    staleTime: 10_000,
  });

  const invoices = useMemo<Invoice[]>(() => {
    if (!invoicesData) return [];
    const list = Array.isArray(invoicesData) ? invoicesData : [];
    return list.filter(
      (inv) => Number(inv.balance) > 0 && inv.status !== "CANCELLED",
    );
  }, [invoicesData]);

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);
  const balance = selectedInvoice ? Number(selectedInvoice.balance) : 0;

  // Reset du montant quand on change de facture
  useEffect(() => {
    // Si la facture change, on efface l'echeance pre-selectionnee
    if (preselectedInvoiceId && invoiceId !== preselectedInvoiceId) {
      setInstallmentId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  useEffect(() => {
    if (selectedInvoice) {
      setAmount(String(Math.round(balance)));
    } else {
      setAmount("");
    }
  }, [invoiceId, balance, selectedInvoice]);

  const amountNum = parseFloat(amount) || 0;
  const isOverBalance = amountNum > balance + 0.001;
  const isValid =
    !!student && !!selectedInvoice && amountNum > 0 && !isOverBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !selectedInvoice || !student) return;

    const input: any = {
      invoiceId: selectedInvoice.id,
      studentId: student.id,
      amount: amountNum,
      method,
    };
    if (reference.trim()) input.reference = reference.trim();
    if (installmentId) input.installmentId = installmentId;

    try {
      await createMutation.mutateAsync(input);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    } catch {
      // erreur geree par le hook
    }
  };

  const needsReference =
    method === "MOBILE_MONEY" || method === "TRANSFER" || method === "CHECK";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Encaisser un paiement</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Selectionnez un élève puis sa facture
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* CORPS */}
          <div className="p-6 space-y-5">
            {/* ETAPE 1 - ELEVE */}
            <div>
              <Label className="text-sm font-medium">
                1. Eleve
              </Label>
              <div className="mt-1">
                <StudentPicker value={student} onChange={(s) => {
                  setStudent(s);
                  setInvoiceId("");
                }} />
              </div>
            </div>

            {/* ETAPE 2 - FACTURE */}
            {student && (
              <div>
                <Label className="text-sm font-medium">
                  2. Facture a encaisser
                </Label>
                <div className="mt-1">
                  {loadingInvoices ? (
                    <div className="flex items-center justify-center py-6 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground border rounded-md border-dashed">
                      Aucune facture impayee pour cet eleve
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv) => {
                        const isSelected = invoiceId === inv.id;
                        return (
                          <button
                            key={inv.id}
                            type="button"
                            onClick={() => setInvoiceId(inv.id)}
                            className={cn(
                              "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md border-2 text-left transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-input hover:border-primary/50",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-mono font-semibold">
                                  {inv.number}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Total : {formatFCFA(inv.totalAmount)} · Payé : {formatFCFA(inv.paidAmount)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Solde</p>
                              <p className="text-sm font-mono font-bold text-red-600">
                                {formatFCFA(inv.balance)}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPE 3 - MONTANT */}
            {selectedInvoice && (
              <>
                <div>
                  <Label className="text-sm font-medium">
                    3. Montant a encaisser (FCFA) *
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      className={cn(
                        "flex-1 font-mono text-lg font-bold text-right",
                        isOverBalance && "border-destructive",
                      )}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAmount(String(Math.round(balance)))}
                    >
                      Payer tout
                    </Button>
                  </div>
                  {isOverBalance && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Le montant depasse le solde ({formatFCFA(balance)})
                    </div>
                  )}
                  {!isOverBalance && amountNum > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFCFA(amountNum)}
                    </p>
                  )}
                </div>

                {/* METHODE */}
                <div>
                  <Label className="text-sm font-medium">4. Methode de paiement</Label>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {METHODS.map((m) => {
                      const info = PAYMENT_METHOD_LABELS[m];
                      const isSelected = method === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 text-xs font-medium transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-input hover:border-primary/50",
                          )}
                        >
                          <span className="text-lg">{info.emoji}</span>
                          <span className="text-[10px] text-center">{info.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* REFERENCE */}
                {needsReference && (
                  <div>
                    <Label htmlFor="reference" className="text-sm font-medium">
                      Reference {method === "MOBILE_MONEY" ? "(N° transaction)" : ""}
                    </Label>
                    <Input
                      id="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={
                        method === "MOBILE_MONEY"
                          ? "Ex: OM-20261004-1234"
                          : method === "CHECK"
                          ? "Ex: N° cheque"
                          : "Ex: N° virement"
                      }
                      className="mt-1 font-mono"
                      maxLength={80}
                    />
                  </div>
                )}

                {/* RECAP */}
                <div className="rounded-lg bg-green-50/50 border border-green-200 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Élève</p>
                      <p className="font-medium">
                        {student?.lastName} {student?.firstName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Facture</p>
                      <p className="font-mono text-xs">{selectedInvoice.number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Montant a encaisser</p>
                      <p className="font-bold text-green-700 font-mono">
                        +{formatFCFA(amountNum)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nouveau solde</p>
                      <p className="font-mono font-semibold text-red-600">
                        {formatFCFA(Math.max(balance - amountNum, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4 mr-2" />
              )}
              Enregistrer le paiement
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
