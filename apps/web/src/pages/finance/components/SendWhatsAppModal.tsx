import { useState, useMemo } from "react";
import { X, MessageCircle, Send } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/types/finance";
import { messagesApi } from "@/api/messages";

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  relationType?: string;
}

interface SchoolInfo {
  name: string;
  sigle?: string | null;
  logoUrl?: string | null;
  motto?: string | null;
}

interface InvoiceItem {
  feeType?: { name: string; code: string; category: string } | null;
  description?: string | null;
  quantity: number;
  unitAmount: number | string;
  totalAmount: number | string;
}

interface Props {
  student: {
    id?: string;
    firstName: string;
    lastName: string;
    matricule: string;
    guardians?: Array<{ guardian: Guardian }>;
  };
  school: SchoolInfo | null | undefined;
  paymentAmount: number;
  paymentDate: string;
  receiptNumber?: string | null;
  invoiceNumber?: string | null;
  invoiceId?: string | null;
  invoiceItems?: InvoiceItem[];
  onClose: () => void;
}

function normalizePhone(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00223")) digits = digits.slice(5);
  if (digits.startsWith("223") && digits.length === 11) digits = digits.slice(3);
  if (digits.length === 8) return `223${digits}`;
  if (digits.length === 11 && digits.startsWith("223")) return digits;
  return digits;
}

function civility(relationType?: string): string {
  if (!relationType) return "M.";
  const r = relationType.toUpperCase();
  if (r === "MOTHER" || r === "MERE") return "Mme";
  if (r === "FATHER" || r === "PERE" || r === "TUTOR" || r === "TUTEUR") return "M.";
  return "M.";
}

function formatMotif(items?: InvoiceItem[]): string {
  if (!items || items.length === 0) return "";
  const labels = items
    .map((it) => {
      if (it.feeType?.name) return it.feeType.name;
      if (it.description) return it.description;
      return null;
    })
    .filter((l): l is string => !!l);
  return labels.join(", ");
}

export function SendWhatsAppModal({
  student,
  school,
  paymentAmount,
  paymentDate,
  receiptNumber,
  invoiceNumber,
  invoiceId,
  invoiceItems,
  onClose,
}: Props) {
  const guardians = useMemo<Guardian[]>(() => {
    return (student.guardians || [])
      .map((g) => g.guardian)
      .filter((g): g is Guardian => !!g && !!g.phone);
  }, [student.guardians]);

  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(
    guardians.length > 0 ? guardians[0] : null,
  );
  const [phone, setPhone] = useState(
    guardians.length > 0 ? guardians[0].phone : "",
  );

  const buildMessage = (g: Guardian | null) => {
    const schoolName = school?.name || "notre etablissement";
    const amount = formatFCFA(paymentAmount);
    const date = new Date(paymentDate).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const greeting = g
      ? `Bonjour ${civility(g.relationType)} ${g.lastName.toUpperCase()} ${g.firstName},\n\n`
      : `Bonjour,\n\n`;
    const motif = formatMotif(invoiceItems);
    const motifLine = motif ? `\nMotif : ${motif}` : "";
    const receiptLine = receiptNumber ? `\nRecu N° : ${receiptNumber}` : "";
    const invoiceLine = invoiceNumber ? `\nFacture : ${invoiceNumber}` : "";
    return `${greeting}Nous confirmons la reception de votre paiement de ${amount} pour ${student.firstName} ${student.lastName} le ${date}.${motifLine}${invoiceLine}${receiptLine}\n\nMerci de votre confiance.\n${schoolName}`;
  };

  const [message, setMessage] = useState(() => buildMessage(selectedGuardian));

  const normalizedPhone = normalizePhone(phone);
  const isValid = normalizedPhone.length >= 11;

  const handleSelectGuardian = (g: Guardian) => {
    setSelectedGuardian(g);
    setPhone(g.phone);
    setMessage(buildMessage(g));
  };

  const handleSend = async () => {
    if (!isValid) return;

    // 1. Logger l'envoi AVANT d'ouvrir WhatsApp (tracabilite obligatoire).
    //    Si le log echoue, on log en console mais on n'empeche PAS l'envoi.
    try {
      await messagesApi.create({
        studentId: student.id,
        guardianId: selectedGuardian?.id,
        invoiceId: invoiceId || undefined,
        type: receiptNumber ? "RECEIPT" : "OTHER",
        channel: "WHATSAPP",
        recipientPhone: phone,
        recipientName: selectedGuardian
          ? `${selectedGuardian.lastName.toUpperCase()} ${selectedGuardian.firstName}`
          : undefined,
        message,
        status: "SENT",
      });
    } catch (err) {
      // Non bloquant : le message part quand meme
      console.warn("[WhatsApp] Echec du log message_logs :", err);
    }

    // 2. Ouvrir WhatsApp
    //    Certains navigateurs bloquent les window.open() successifs.
    //    On ouvre un nouvel onglet SYNCHRONE (juste apres l'await), et si
    //    le navigateur le bloque, on propose un fallback manuel.
    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

    const popup = window.open(url, "_blank", "noopener,noreferrer");

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      // Popup bloque : on ouvre un lien cliquable dans une alerte discrete
      // et on ne ferme PAS le modal pour laisser l'utilisateur cliquer.
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener,noreferrer";
      link.textContent = "Cliquez ici pour ouvrir WhatsApp";
      link.style.cssText =
        "display:block;padding:12px;margin-top:12px;background:#25D366;color:#fff;border-radius:6px;text-align:center;font-weight:600;text-decoration:none;";
      // Injecter dans le conteneur du modal (le div avec classe bg-background)
      const container = document.querySelector(".bg-background.rounded-lg.shadow-xl");
      if (container) {
        const existing = container.querySelector("[data-wa-fallback]");
        if (existing) existing.remove();
        link.setAttribute("data-wa-fallback", "1");
        container.appendChild(link);
      }
      // NE PAS appeler onClose() : on laisse l'utilisateur cliquer
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-lg w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Envoyer par WhatsApp</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Reçu de {formatFCFA(paymentAmount)} pour {student.firstName}{" "}
                {student.lastName}
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {guardians.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Choisir un tuteur</Label>
              <div className="mt-2 space-y-1.5">
                {guardians.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGuardian(g)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border-2 text-left text-sm transition-all",
                      selectedGuardian?.id === g.id
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50",
                    )}
                  >
                    <div>
                      <span className="font-medium">
                        {civility(g.relationType)} {g.lastName.toUpperCase()}{" "}
                        {g.firstName}
                      </span>
                      {g.relationType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({g.relationType})
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {g.phone}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="phone" className="text-sm font-medium">
              Numero WhatsApp *
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+223 76 12 34 56"
              className="mt-1 font-mono"
            />
            {phone && (
              <p className="text-xs text-muted-foreground mt-1">
                Numero formate :{" "}
                <span className="font-mono text-green-600">
                  +{normalizedPhone}
                </span>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="message" className="text-sm font-medium">
              Message
            </Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/2000
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={!isValid}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Ouvrir WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
