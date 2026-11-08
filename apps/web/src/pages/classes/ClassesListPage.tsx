import { useState, useMemo } from "react";
import { School, Search, Plus, DoorOpen } from "lucide-react";
import { Input, Button, PageLoader, EmptyState } from "@/components/ui";
import { useClasses } from "@/hooks/classes";
import { useAuth } from "@/contexts/AuthContext";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";
import { CycleSection } from "./components/CycleSection";
import { CreateClassModal } from "./components/CreateClassModal";
import { RoomsTab } from "./components/RoomsTab";
import type { ClassItem, LevelCycle } from "@/types/class";

export function ClassesListPage() {
  const { hasPermission } = useAuth();
  const isReadOnly = useIsReadOnly();
  const canCreate = hasPermission("class:create") && !isReadOnly;
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultCycle, setModalDefaultCycle] =
    useState<LevelCycle>("PREMIER_CYCLE");
  const [activeTab, setActiveTab] = useState<"classes" | "rooms">("classes");

  const { data: classes, isLoading } = useClasses();

  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.level?.name?.toLowerCase().includes(q) ||
        c.room?.name?.toLowerCase().includes(q),
    );
  }, [classes, searchQuery]);

  const { firstCycle, secondCycle } = useMemo(() => {
    const first: ClassItem[] = [];
    const second: ClassItem[] = [];
    filteredClasses.forEach((c) => {
      if (c.level?.cycle === "PREMIER_CYCLE") first.push(c);
      else if (c.level?.cycle === "DEUXIEME_CYCLE") second.push(c);
    });
    return { firstCycle: first, secondCycle: second };
  }, [filteredClasses]);

  const openModal = (cycle: LevelCycle) => {
    setModalDefaultCycle(cycle);
    setModalOpen(true);
  };

  const totalClasses = classes?.length ?? 0;
  const totalStudents = useMemo(() => {
    if (!classes) return 0;
    return classes.reduce((sum, c) => sum + (c._count?.enrollments ?? 0), 0);
  }, [classes]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-1 border-b border-sis-neutral-200 dark:border-sis-neutral-800">
        <button
          onClick={() => setActiveTab("classes")}
          className={
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 " +
            (activeTab === "classes"
              ? "border-sis-brand text-sis-brand"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          <School className="h-4 w-4" />
          Classes
        </button>
        <button
          onClick={() => setActiveTab("rooms")}
          className={
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 " +
            (activeTab === "rooms"
              ? "border-sis-brand text-sis-brand"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          <DoorOpen className="h-4 w-4" />
          Salles
        </button>
      </div>

      {activeTab === "rooms" ? (
        <RoomsTab />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-sis-md bg-sis-brand-50 text-sis-brand mt-0.5 dark:bg-sis-brand-900/30 dark:text-sis-brand-300">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalClasses} classe{totalClasses > 1 ? "s" : ""} ·{" "}
                  {totalStudents} élève{totalStudents > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {canCreate && (
              <Button onClick={() => openModal("PREMIER_CYCLE")}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle classe
              </Button>
            )}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une classe (nom, code, niveau, salle)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-sis-md border-sis-neutral-200 focus:ring-sis-brand/30 focus:border-sis-brand dark:border-sis-neutral-700"
            />
          </div>

          {isLoading ? (
            <PageLoader label="Chargement des classes..." />
          ) : totalClasses === 0 ? (
            <EmptyState
              icon={<School className="h-7 w-7" />}
              title="Aucune classe pour le moment"
              description="Commencez par créer votre première classe."
              action={
                canCreate ? (
                  <Button onClick={() => openModal("PREMIER_CYCLE")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle classe
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-10">
              <CycleSection
                cycle="PREMIER_CYCLE"
                classes={firstCycle}
                onCreateClick={() => openModal("PREMIER_CYCLE")}
                canCreate={canCreate}
              />
              <CycleSection
                cycle="DEUXIEME_CYCLE"
                classes={secondCycle}
                onCreateClick={() => openModal("DEUXIEME_CYCLE")}
                canCreate={canCreate}
              />
            </div>
          )}

          {modalOpen && !isReadOnly && (
            <CreateClassModal
              defaultCycle={modalDefaultCycle}
              onClose={() => setModalOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}