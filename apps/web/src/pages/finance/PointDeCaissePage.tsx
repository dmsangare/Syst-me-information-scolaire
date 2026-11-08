import { useState } from "react";
import { Loader2, Search, Wallet } from "lucide-react";
import { useCurrentCashSession } from "@/hooks/finance/useCashSessions";
import { Card, CardContent } from "@/components/ui";
import { CashSessionOpenForm } from "./components/CashSessionOpenForm";
import { CashSessionHeader } from "./components/CashSessionHeader";
import { StudentPicker } from "./components/StudentPicker";
import { InvoicePanel } from "./components/InvoicePanel";
import { PaymentPanel } from "./components/PaymentPanel";
import { TodaySummary } from "./components/TodaySummary";
import { SendWhatsAppModal } from "./components/SendWhatsAppModal";
import { FamilySettleModal } from "./components/FamilySettleModal";
import { useStudentDetail } from "@/hooks/students/useStudentDetail";
import { Button } from "@/components/ui";
import { Users } from "lucide-react";
import { useSchool } from "@/hooks/school/useSchool";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";
import type { Invoice, InvoiceInstallment } from "@/types/finance";

interface StudentLite {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  enrollments?: Array<{
    id: string;
    academicYearId: string;
    class?: { id: string; name: string } | null;
    level?: { id: string; name: string } | null;
  }>;
}

export function PointDeCaissePage() {
  const { data: session, isLoading } = useCurrentCashSession();
  const isReadOnly = useIsReadOnly();
  const [student, setStudent] = useState<StudentLite | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [selectedInstallment, setSelectedInstallment] =
    useState<InvoiceInstallment | null>(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [lastPayment, setLastPayment] = useState<{
    paymentId: string;
    receiptId?: string;
    receiptNumber?: string;
    amount: number;
    date: string;
  } | null>(null);

  const { data: studentDetail } = useStudentDetail(student?.id);
  const { data: school } = useSchool();

  // 1. Chargement
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Pas de session → formulaire d'ouverture (mais SEULEMENT pour non-readonly)
  if (!session) {
    if (isReadOnly) {
      return (
        <div className="flex h-96 items-center justify-center text-muted-foreground">
          <p>Aucune session de caisse ouverte pour le moment.</p>
        </div>
      );
    }
    return <CashSessionOpenForm />;
  }

  // 3. Session ouverte → interface complète
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <CashSessionHeader session={session} />

      {/* Barre de recherche */}
      <div className="border-b bg-card px-6 py-3">
        <div className="max-w-2xl">
          <StudentPicker
            value={student}
            onChange={(s) => {
              setStudent(s);
              setActiveInvoice(null);
              setSelectedInstallment(null);
              setLastPayment(null);
            }}
          />
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto p-6">
        {!student ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                Recherchez un élève pour commencer
              </p>
              <p className="text-xs mt-1">
                Tapez un nom, un matricule ou un téléphone parent
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panneau facture */}
            <div>
              <InvoicePanel
                student={student}
                onSelectInvoice={setActiveInvoice}
                onPayInstallment={(inst: InvoiceInstallment) => {
                  if (isReadOnly) return;
                  setSelectedInstallment(inst);
                }}
              />
            </div>

            {/* Panneau encaissement */}
            <div>
              {/* Bouton Encaisser Famille (masqué si read-only) */}
              {!isReadOnly && student && studentDetail && (studentDetail.guardians?.length || 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFamilyOpen(true)}
                  className="w-full mb-3 border-primary/40 hover:bg-primary/5"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Encaisser pour la famille
                </Button>
              )}

              {activeInvoice ? (
                isReadOnly ? (
                  <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">
                        Consultation uniquement
                      </p>
                      <p className="text-xs mt-1">
                        Vous n'avez pas les droits pour encaisser.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <PaymentPanel
                    invoice={activeInvoice}
                    studentId={student.id}
                    installment={selectedInstallment}
                    onPaymentSuccess={() => {
                      setSelectedInstallment(null);
                    }}
                    onPaymentComplete={(info) => {
                      setLastPayment({
                        paymentId: info.paymentId,
                        receiptId: info.receiptId,
                        receiptNumber: info.receiptNumber,
                        amount: info.amount,
                        date: new Date().toISOString(),
                      });
                      setWhatsappOpen(true);
                    }}
                    onClearInstallment={() => setSelectedInstallment(null)}
                  />
                )
              ) : (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      Sélectionnez une facture
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recap du jour */}
      <TodaySummary />

      {/* Modal Encaissement Famille */}
      {!isReadOnly &&
        familyOpen &&
        student &&
        studentDetail &&
        (studentDetail.guardians?.length || 0) > 0 && (
          <FamilySettleModal
            studentId={student.id}
            studentName={`${studentDetail.lastName} ${studentDetail.firstName}`}
            guardianId={studentDetail.guardians![0].guardian.id}
            guardianName={`${studentDetail.guardians![0].guardian.lastName.toUpperCase()} ${studentDetail.guardians![0].guardian.firstName}`}
            onClose={() => setFamilyOpen(false)}
            onSuccess={(info) => {
              setFamilyOpen(false);
              setLastPayment({
                paymentId: info.paymentId,
                receiptId: info.receiptId,
                receiptNumber: info.receiptNumber,
                amount: info.amount,
                date: info.date,
              });
              setWhatsappOpen(true);
            }}
          />
        )}

      {/* Modal WhatsApp post-paiement */}
      {!isReadOnly &&
        whatsappOpen &&
        lastPayment &&
        studentDetail &&
        activeInvoice && (
          <SendWhatsAppModal
            student={{
              id: studentDetail.id,
              firstName: studentDetail.firstName,
              lastName: studentDetail.lastName,
              matricule: studentDetail.matricule,
              guardians: (studentDetail.guardians || []) as any,
            }}
            school={school || null}
            paymentAmount={lastPayment.amount}
            paymentDate={lastPayment.date}
            receiptNumber={lastPayment.receiptNumber}
            invoiceNumber={activeInvoice.number}
            invoiceId={activeInvoice.id}
            invoiceItems={(activeInvoice.items || []) as any}
            onClose={() => {
              setWhatsappOpen(false);
              setLastPayment(null);
            }}
          />
        )}
    </div>
  );
}