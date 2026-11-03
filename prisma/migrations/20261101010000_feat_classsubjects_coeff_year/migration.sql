-- ============================================================
-- MIGRATION MATIERES - PRODUCTION V3
-- Contenu strictement limite au perimetre du chantier.
-- Aucune modification des tables historiques (admin_reports,
-- exam_dossiers, state_exam_sessions, payments).
-- ============================================================

-- 1. SUBJECT_COEFFICIENT : historisation par annee
-- ============================================================
DROP INDEX IF EXISTS "subject_coefficients_subject_id_level_id_key";

ALTER TABLE "subject_coefficients" ADD COLUMN "academic_year_id" UUID NOT NULL;

CREATE INDEX "subject_coefficients_academic_year_id_idx" ON "subject_coefficients"("academic_year_id");

CREATE INDEX "subject_coefficients_level_id_academic_year_id_idx" ON "subject_coefficients"("level_id", "academic_year_id");

CREATE UNIQUE INDEX "subject_coefficients_subject_id_level_id_academic_year_id_key" ON "subject_coefficients"("subject_id", "level_id", "academic_year_id");

ALTER TABLE "subject_coefficients" ADD CONSTRAINT "subject_coefficients_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. SUBJECT : ajout description
-- ============================================================
ALTER TABLE "subjects" ADD COLUMN "description" VARCHAR(500);

-- 3. CLASS_SUBJECT : nouvelle table pivot
-- ============================================================
CREATE TABLE "class_subjects" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "scale" SMALLINT NOT NULL DEFAULT 10,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_subjects_class_id_academic_year_id_is_active_idx" ON "class_subjects"("class_id", "academic_year_id", "is_active");
CREATE INDEX "class_subjects_subject_id_idx" ON "class_subjects"("subject_id");
CREATE INDEX "class_subjects_academic_year_id_idx" ON "class_subjects"("academic_year_id");
CREATE UNIQUE INDEX "class_subjects_class_id_subject_id_academic_year_id_key" ON "class_subjects"("class_id", "subject_id", "academic_year_id");

ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. SUBJECT_COEFFICIENT_AUDIT : tracabilite
-- ============================================================
CREATE TABLE "subject_coefficient_audits" (
    "id" UUID NOT NULL,
    "coefficient_id" UUID NOT NULL,
    "old_value" DECIMAL(4,2),
    "new_value" DECIMAL(4,2),
    "user_id" UUID NOT NULL,
    "motive" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_coefficient_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subject_coefficient_audits_coefficient_id_idx" ON "subject_coefficient_audits"("coefficient_id");
CREATE INDEX "subject_coefficient_audits_created_at_idx" ON "subject_coefficient_audits"("created_at");

ALTER TABLE "subject_coefficient_audits" ADD CONSTRAINT "subject_coefficient_audits_coefficient_id_fkey" FOREIGN KEY ("coefficient_id") REFERENCES "subject_coefficients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subject_coefficient_audits" ADD CONSTRAINT "subject_coefficient_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
