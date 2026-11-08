import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users, Plus, FileSpreadsheet, Trash2, UserCheck, FileText,
} from "lucide-react";
import { useStudents, useDeleteStudent, useStudentStats, useExportStudents } from "@/hooks/students";
import { useAuth } from "@/contexts/AuthContext";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";
import {
  PageHeader,
  StatsCard,
  Pagination,
  ExportButton,
  BulkActionsBar,
  EmptyState,
  ConfirmDialog,
} from "@/components/shared";
import { Button, Card, CardContent } from "@/components/ui";
import { StudentFilters } from "./components/StudentFilters";
import { StudentTable } from "./components/StudentTable";
import type { Student, StudentListFilters } from "@/types/student";

const DEFAULT_FILTERS: StudentListFilters = {
  page: 1,
  limit: 20,
  sortField: "lastName",
  sortDirection: "asc",
};

export function StudentsListPage() {
  const { hasPermission, hasRole } = useAuth();
  const isReadOnly = useIsReadOnly();
  const canCreate = hasPermission("student:create");
  const canExport = hasPermission("student:export");
  const canDelete = hasPermission("student:delete");
  const canViewStats = hasRole("SUPER_ADMIN") || hasRole("DIRECTOR") || hasRole("SECRETARY") || hasRole("ACCOUNTANT") || hasRole("PROMOTEUR");

  const [filters, setFilters] = useState<StudentListFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const { data, isLoading } = useStudents(filters);
  const { data: stats } = useStudentStats();
  const deleteMutation = useDeleteStudent();
  const exportMutation = useExportStudents();

  const students = data?.data || [];
  const meta = data?.meta;

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" || value === "" ? undefined : value,
      page: key !== "page" ? 1 : value,
    }));
    setSelectedIds([]);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSelectedIds([]);
  }, []);

  const handleSortChange = useCallback((field: string, direction: "asc" | "desc") => {
    setFilters((prev) => ({ ...prev, sortField: field, sortDirection: direction }));
  }, []);

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    exportMutation.mutate({ format, filters });
  };

  const handleBulkDelete = () => {
    if (confirm(`Supprimer ${selectedIds.length} eleve(s) ?`)) {
      selectedIds.forEach((id) => deleteMutation.mutate(id));
      setSelectedIds([]);
    }
  };

  const hasFilters = useMemo(() => {
    return Boolean(
      filters.q ||
        filters.classId ||
        filters.levelId ||
        filters.cycle ||
        filters.gender ||
        filters.ageRange ||
        filters.status ||
        filters.enrollmentStatus
    );
  }, [filters]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Élèves"
        description={`${meta?.total || 0} eleve(s) enregistre(s)`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <>
            {canExport && (
              <ExportButton
                onExportExcel={() => handleExport("excel")}
                onExportPDF={() => handleExport("pdf")}
                onExportCSV={() => handleExport("csv")}
                disabled={exportMutation.isPending}
              />
            )}
            {canCreate && (
              <Button variant="outline" asChild disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
                <Link to="/students/import">
                  <FileSpreadsheet className="h-4 w-4" />
                  Importer Excel
                </Link>
              </Button>
            )}
            {canCreate && (
              <Button asChild disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
                <Link to="/students/new">
                  <Plus className="h-4 w-4" />
                  Nouvel eleve
                </Link>
              </Button>
            )}
          </>
        }
      />

      {stats && canViewStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total eleves"
            value={stats.total}
            icon={<Users className="h-5 w-5" />}
            description={`${stats.boys} garcons, ${stats.girls} filles`}
          />
          <StatsCard
            title="Nouveaux"
            value={stats.newCount}
            icon={<UserCheck className="h-5 w-5" />}
            variant="success"
            description="Inscrits cette annee"
          />
          <StatsCard
            title="Anciens"
            value={stats.ancienCount}
            icon={<FileText className="h-5 w-5" />}
            variant="info"
            description="Deja la l année derniere"
          />
          <StatsCard
            title="Redoublants"
            value={stats.redoublantCount}
            icon={<FileText className="h-5 w-5" />}
            variant="warning"
            description="Meme niveau que l an dernier"
          />
        </div>
      )}

      <StudentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      <Card>
        <CardContent className="p-0">
          <StudentTable
            students={students}
            isLoading={isLoading}
            selection={{
              enabled: true,
              selectedIds,
              onSelectionChange: setSelectedIds,
            }}
            sort={{
              field: filters.sortField || "lastName",
              direction: filters.sortDirection || "asc",
              onSortChange: handleSortChange,
            }}
            onDelete={(student) => setDeleteTarget(student)}
            emptyState={
              <EmptyState
                icon={<Users className="h-8 w-8 text-muted-foreground/50" />}
                title={hasFilters ? "Aucun resultat" : "Aucun élève"}
                description={
                  hasFilters
                    ? "Aucun élève ne correspond a vos criteres de recherche."
                    : "Commencez par ajouter votre premier eleve."
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={handleReset}>
                      Reinitialiser les filtres
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {canCreate && (
                        <Button variant="outline" asChild disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
                          <Link to="/students/import">
                            <FileSpreadsheet className="h-4 w-4" />
                            Importer Excel
                          </Link>
                        </Button>
                      )}
                      {canCreate && (
                        <Button asChild disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
                          <Link to="/students/new">
                            <Plus className="h-4 w-4" />
                            Ajouter un eleve
                          </Link>
                        </Button>
                      )}
                    </div>
                  )
                }
              />
            }
          />

          {meta && meta.pages > 1 && (
            <Pagination
              page={meta.page}
              pages={meta.pages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={(page) => handleFilterChange("page", page)}
              onLimitChange={(limit) => handleFilterChange("limit", limit)}
            />
          )}
        </CardContent>
      </Card>

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          ...(canExport
            ? [
                {
                  label: "Exporter Excel",
                  icon: <FileSpreadsheet className="h-4 w-4" />,
                  onClick: () => handleExport("excel"),
                },
              ]
            : []),
          ...(canDelete
            ? [
                {
                  label: "Supprimer",
                  icon: <Trash2 className="h-4 w-4" />,
                  variant: "destructive" as const,
                  onClick: handleBulkDelete,
                },
              ]
            : []),
        ]}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer l eleve"
        description={`Voulez-vous vraiment supprimer ${deleteTarget?.firstName} ${deleteTarget?.lastName} ? Cette action est reversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}