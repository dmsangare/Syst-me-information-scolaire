import { useState } from "react";
import { Wallet, Loader2, Lock, AlertTriangle } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useCloseCashSession } from "@/hooks/finance/useCashSessions";
import { formatFCFA } from "@/types/finance";
import type { CashSession } from "@/types/finance";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";

interface Props {
  session: CashSession;
  todayTotal?: number;
}

export function CashSessionHeader({ session, todayTotal }: Props) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingAmount, setClosingAmount] = useState("");
  const closeMutation = useCloseCashSession();
  const isReadOnly = useIsReadOnly();

  const handleClose = () => {
    const value = Number(closingAmount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(value) || value < 0) return;
    closeMutation.mutate(
      { id: session.id, dto: { closingBalance: value } },
      {
        onSuccess: () => {
          setShowCloseModal(false);
          setClosingAmount("");
        },
      },
    );
  };

  return (
    <>
      <div className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">Point de caisse</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">
                Session ouverte
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ouverte le{" "}
              {new Date(session.openedAt).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              Fonds initial : {formatFCFA(Number(session.openingAmount))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {todayTotal !== undefined && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Aujourd'hui</div>
              <div className="font-mono font-semibold">
                {formatFCFA(todayTotal)}
              </div>
            </div>
          )}
          {!isReadOnly && (
            <Button
              variant="outline"
              onClick={() => setShowCloseModal(true)}
              disabled={closeMutation.isPending}
            >
              <Lock className="h-4 w-4 mr-2" />
              Clôturer
            </Button>
          )}
        </div>
      </div>

      {showCloseModal && !isReadOnly && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Clôturer la caisse</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Comptez les espèces en caisse et saisissez le montant.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Montant compté en espèces
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="text-right font-mono text-lg"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    FCFA
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseModal(false)}
                  disabled={closeMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleClose}
                  disabled={closeMutation.isPending || closingAmount === ""}
                  variant="destructive"
                >
                  {closeMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Confirmer la clôture
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}