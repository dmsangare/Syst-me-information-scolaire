import { useState } from "react";
import { X, Users as UsersIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Input, Label, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatFCFA, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/types/finance";
import { paymentsApi } from "@/api/payments";
import { useSiblings, type Sibling } from "@/hooks/students/useSiblings";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/axios";

interface Props {
  studentId: string;
  studentName: string;
  guardianId: string;
  guardianName: string;
  onClose: () => void;
  onSuccess: (info: {
    paymentId: string;
    receiptId?: string;
    receiptNumber?: string;
    amount: number;
    date: string;
  }) => void;
}

export function FamilySettleModal({
  studentId,
  studentName,
  guardianId,
  guardianName,
  onClose,
  onSuccess,
}: Props) {
  const { data: siblings = [], isLoading } = useSiblings(studentId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amountNum = Number(amount.replace(/\s/g, "")) || 0;
  const isValid = amountNum > 0 && guardianId;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    try {
      const result = await paymentsApi.settleFamily({
        guardianId,
        amount: amountNum,
        method,
        reference: reference || undefined,
        note: note || undefined,
        idempotencyKey: `family-${guardianId}-${Date.now()}`,
      });

      const totalApplied = result.totalApplied ?? amountNum;
      const firstPayment = result.payments?.[0];

      toast.success(
        `${formatFCFA(totalApplied)} repartis sur ${result.payments?.length || 0} facture(s)`,
      );

      onSuccess({
        paymentId: firstPayment?.id || "",
        receiptId: firstPayment?.id ? undefined : undefined,
        receiptNumber: firstPayment?.receiptNumber,
        amount: totalApplied,
        date: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const totalDue = siblings.reduce((sum, s) => sum + 0, 0); // calcul serveur de toute façon

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-lg w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Encaisser pour la famille</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {guardianName} — {siblings.length + 1} enfant(s)
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Liste des enfants */}
          <div>
            <Label className="text-sm font-medium">Enfants du tuteur</Label>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border-2 border-primary bg-primary/5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{studentName}</span>
                <span className="ml-auto text-xs text-muted-foreground">élève courant</span>
              </div>
              {isLoading ? (
                <div className="text-xs text-muted-foreground px-3 py-2">Chargement...</div>
              ) : siblings.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Aucun frère/sÅ“ur trouvé pour ce tuteur
                </div>
              ) : (
                siblings.map((sib) => (
                  <div key={sib.id} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm">
                    <span className="font-medium">{sib.lastName} {sib.firstName}</span>
                    <span className="ml-auto text-xs text-muted-foreground font-mono">{sib.matricule}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Montant */}
          <div>
            <Label htmlFor="fam-amount" className="text-sm font-medium">
              Montant Ã  encaisser *
            </Label>
            <Input
              id="fam-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 80000"
              className="mt-1 font-mono text-lg"
              inputMode="numeric"
              autoFocus
            />
            {amountNum > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Montant : <span className="font-medium">{formatFCFA(amountNum)}</span>
              </p>
            )}
          </div>

          {/* Méthode */}
          <div>
            <Label className="text-sm font-medium">Mode de paiement *</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => {
                const info = PAYMENT_METHOD_LABELS[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      "px-3 py-2 rounded-md border-2 text-sm text-left transition-all",
                      method === m
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50",
                    )}
                  >
                    <span className="mr-2">{info.emoji}</span>
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Référence (obligatoire pour non-espèces) */}
          {method !== "CASH" && (
            <div>
              <Label htmlFor="fam-ref" className="text-sm font-medium">
                Référence *
              </Label>
              <Input
                id="fam-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° transaction"
                className="mt-1 font-mono"
              />
            </div>
          )}

          {/* Note */}
          <div>
            <Label htmlFor="fam-note" className="text-sm font-medium">Note (optionnel)</Label>
            <Input
              id="fam-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Commentaire interne"
              className="mt-1"
            />
          </div>

          <Card className="bg-muted/30">
            <CardContent className="py-3 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Le montant sera réparti <strong>FIFO</strong> sur les factures non soldées
              des enfants de ce tuteur, de la plus ancienne Ã  la plus récente.
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Encaissement..." : `Encaisser ${amountNum > 0 ? formatFCFA(amountNum) : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
