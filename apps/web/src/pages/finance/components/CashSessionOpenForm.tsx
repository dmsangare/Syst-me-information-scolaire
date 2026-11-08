import { useState } from "react";
import { Wallet, Loader2, ArrowRight, Lock } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useOpenCashSession } from "@/hooks/finance/useCashSessions";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";

export function CashSessionOpenForm() {
  const [amount, setAmount] = useState("");
  const openMutation = useOpenCashSession();
  const isReadOnly = useIsReadOnly();

  // Si lecture seule, on affiche un message neutre au lieu du formulaire
  if (isReadOnly) {
    return (
      <div className="flex items-center justify-center min-h-[500px] p-6">
        <div className="w-full max-w-md bg-card border rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h2 className="font-semibold">Caisse</h2>
                <p className="text-sm text-muted-foreground">
                  Aucune session ouverte
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3 text-center">
            <Lock className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas les droits pour ouvrir une session de caisse.
            </p>
            <p className="text-xs text-slate-400">
              Contactez le comptable ou le directeur pour ouvrir la caisse.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleOpen = () => {
    const value = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(value) || value < 0) return;
    openMutation.mutate(
      { openingBalance: value },
      { onSuccess: () => setAmount("") },
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[500px] p-6">
      <div className="w-full max-w-md bg-card border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Ouverture de caisse</h2>
              <p className="text-sm text-muted-foreground">
                Démarrez votre journée
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Combien avez-vous en espèces pour commencer ?
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOpen();
                }}
                placeholder="50 000"
                autoFocus
                className="text-right font-mono text-lg"
              />
              <span className="text-sm font-medium text-muted-foreground">
                FCFA
              </span>
            </div>
          </div>

          <Button
            onClick={handleOpen}
            disabled={openMutation.isPending || amount === ""}
            className="w-full"
            size="lg"
          >
            {openMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ouverture…
              </>
            ) : (
              <>
                Ouvrir la caisse
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Vous pourrez clôturer la caisse en fin de journée
          </p>
        </div>
      </div>
    </div>
  );
}