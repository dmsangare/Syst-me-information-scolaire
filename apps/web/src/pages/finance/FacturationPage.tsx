import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Sparkles, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoicesListPage } from "./InvoicesListPage";
import { ImportSituationPage } from "./ImportSituationPage";
import { BulkInvoiceModal } from "./components/BulkInvoiceModal";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";

const VALID_TABS = ["invoices", "bulk", "import"];

export function FacturationPage() {
  const isReadOnly = useIsReadOnly();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "invoices";
  const activeTab = VALID_TABS.includes(currentTab) ? currentTab : "invoices";

  const [bulkOpen, setBulkOpen] = useState(false);

  const setTab = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-bold">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les factures, générez en masse et importez des situations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="w-full">
        <div className="px-6">
          <TabsList>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              Factures
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Générer en masse
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Importer une situation
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="invoices" className="m-0">
          <InvoicesListPage />
        </TabsContent>

        <TabsContent value="bulk" className="m-0">
          <div className="px-6 py-12">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-primary/30" />
              <h2 className="text-lg font-semibold">Générer les factures en masse</h2>
              <p className="text-sm text-muted-foreground">
                Créez automatiquement les factures pour tous les élèves d'un niveau,
                d'une classe ou de toute l'école.
              </p>
              <Button onClick={() => setBulkOpen(true)} size="lg" disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
                <Plus className="h-4 w-4 mr-2" />
                Lancer la génération en masse
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import" className="m-0">
          <ImportSituationPage />
        </TabsContent>
      </Tabs>

      {bulkOpen && !isReadOnly && <BulkInvoiceModal onClose={() => setBulkOpen(false)} />}
    </div>
  );
}