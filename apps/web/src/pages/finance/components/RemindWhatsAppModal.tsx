import { useState, useMemo } from "react";
import { X, MessageCircle, Send, Check, Phone, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/types/finance";
import { useCreateMessage } from "@/hooks/finance/useMessages";
import type { Reminder } from "@/api/messages";

interface Props {
  reminder: Reminder;
  schoolName: string;
  schoolPhone?: string | null;
  schoolAddress?: string | null;
  onClose: () => void;
  onSent?: () => void;
}

export function RemindWhatsAppModal({
  reminder,
  schoolName,
  schoolPhone,
  schoolAddress,
  onClose,
  onSent,
}: Props) {
  const createMutation = useCreateMessage();
  const [additionalText, setAdditionalText] = useState("");
  const [openedWhatsApp, setOpenedWhatsApp] = useState(false);

  const guardian = reminder.guardian;
  const phone = guardian?.phone || "";
  const guardianName = guardian
    ? `${guardian.firstName} ${guardian.lastName}`
    : "Parent / Tuteur";

  // Message pre-rempli ultra professionnel
  const baseMessage = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Bonjour ${guardianName},`);
    lines.push("");
    lines.push(
      "Nous esperons que vous et votre famille allez bien.",
    );
    lines.push("");
    lines.push(
      `Nous vous informons que la scolarite de votre enfant ${reminder.student.firstName} ${reminder.student.lastName} presente un solde de ${formatFCFA(reminder.balance)} pour l'annee scolaire en cours.`,
    );
    lines.push("");
    lines.push(
      "Nous vous serions reconnaissants de bien vouloir passer au bureau de l'ecole a votre convenance pour regulariser la situation.",
    );
    lines.push("");
    lines.push(
      "Nous restons a votre disposition pour toute information complementaire.",
    );
    lines.push("");
    if (additionalText.trim()) {
      lines.push(additionalText.trim());
      lines.push("");
    }
    lines.push("Cordialement,");
    lines.push(schoolName);
    if (schoolAddress) lines.push(schoolAddress);
    if (schoolPhone) lines.push(`Tel : ${schoolPhone}`);
    return lines.join("\n");
  }, [guardianName, reminder, additionalText, schoolName, schoolAddress, schoolPhone]);

  // Nettoyer le numero : enlever espaces, +, tirets
  const cleanPhone = phone.replace(/[^\d]/g, "");

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) return;
    // Ajouter l'indicatif Mali (+223) si absent
    const phoneWithCountry = cleanPhone.startsWith("223")
      ? cleanPhone
      : `223${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(baseMessage)}`;
    window.open(url, "_blank");
    setOpenedWhatsApp(true);
  };

  const handleConfirmSent = async () => {
    if (!guardian || !cleanPhone) return;
    try {
      await createMutation.mutateAsync({
        studentId: reminder.student.id,
        guardianId: guardian.id,
        invoiceId: reminder.invoiceId,
        type: "REMINDER",
        channel: "WHATSAPP",
        recipientPhone: cleanPhone,
        recipientName: guardianName,
        message: baseMessage,
        status: "SENT",
      });
      onSent?.();
      onClose();
    } catch {
      // erreur geree par le hook
    }
  };

  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const noPhone = !cleanPhone;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Relancer par WhatsApp</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Facture {reminder.invoiceNumber} · {formatFCFA(reminder.balance)} · {reminder.daysLate}j de retard
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* CORPS */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* DESTINATAIRE */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Destinataire
            </Label>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{guardianName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {phone || "Aucun numero renseigne"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {noPhone && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Aucun numero de telephone disponible pour ce parent.
              Verifiez la fiche de l'eleve ou du parent.
            </div>
          )}

          {/* MESSAGE PRE-REMPLI */}
          <div>
            <Label>Message (pre-rempli, professionnel)</Label>
            <div className="mt-1 rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto font-sans">
              {baseMessage}
            </div>
          </div>

          {/* TEXTE ADDITIONNEL */}
          <div>
            <Label htmlFor="additional">
              Texte additionnel (optionnel)
            </Label>
            <textarea
              id="additional"
              value={additionalText}
              onChange={(e) => setAdditionalText(e.target.value)}
              placeholder="Ex: Le comptable vous attend jusqu'a vendredi."
              className={cn(inputClass, "mt-1 min-h-[60px]")}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {additionalText.length}/200 · Ajoute au message avant la signature
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>

          {!openedWhatsApp ? (
            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={noPhone}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Ouvrir WhatsApp
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleConfirmSent}
              disabled={createMutation.isPending}
              className="bg-green-700 hover:bg-green-800"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmer l'envoi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
