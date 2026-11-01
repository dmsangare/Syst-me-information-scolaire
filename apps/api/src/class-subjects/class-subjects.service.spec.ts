import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ClassSubjectsService } from "./class-subjects.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Tests unitaires du ClassSubjectsService.
 *
 * Ces tests couvrent les 7 validations metier :
 *  1. Cloisonnement schoolId (classe + matiere)
 *  2. Coherence annee scolaire (ClassSubject == Class)
 *  3. Coherence cycle / echelle (1er cycle=/10, 2e cycle=/20)
 *  4. Interdiction coefficient au 1er cycle
 *  5. Exigence coefficient au 2e cycle pour matiere obligatoire
 *  6. Anti-doublon (classId + subjectId + academicYearId)
 *  7. Soft-delete (jamais de delete physique)
 */
describe("ClassSubjectsService - Validations metier", () => {
  let service: ClassSubjectsService;
  let prismaMock: any;

  // --- Fixtures reutilisables ---
  const SCHOOL_A = "school-a-uuid";
  const SCHOOL_B = "school-b-uuid";
  const CLASS_1A = { id: "class-1a-uuid", schoolId: SCHOOL_A, academicYearId: "year-2026", levelId: "level-1a-uuid" };
  const CLASS_7A = { id: "class-7a-uuid", schoolId: SCHOOL_A, academicYearId: "year-2026", levelId: "level-7a-uuid" };
  const SUBJECT_A = { id: "subject-fr-uuid", schoolId: SCHOOL_A, isActive: true };
  const SUBJECT_B = { id: "subject-other-uuid", schoolId: SCHOOL_B, isActive: true };
  const LEVEL_1A = { id: "level-1a-uuid", cycle: "PREMIER_CYCLE" };
  const LEVEL_7A = { id: "level-7a-uuid", cycle: "DEUXIEME_CYCLE" };
  const USER_DIRECTOR = {
    id: "user-director",
    schoolId: SCHOOL_A,
    roles: ["DIRECTOR"],
  };
  const USER_SUPER_ADMIN = {
    id: "user-super",
    schoolId: null,
    roles: ["SUPER_ADMIN"],
  };

  beforeEach(async () => {
    prismaMock = {
      class: { findUnique: jest.fn() },
      subject: { findUnique: jest.fn(), findMany: jest.fn() },
      level: { findUnique: jest.fn() },
      classSubject: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subjectCoefficient: { count: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassSubjectsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ClassSubjectsService>(ClassSubjectsService);
  });

  // ============================================================
  // TEST 1 : Cloisonnement schoolId
  // ============================================================
  describe("Validation 1 - Cloisonnement schoolId", () => {
    it("doit refuser si la classe et la matiere sont dans des ecoles differentes", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_7A, level: LEVEL_7A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_B); // ecole B

      const dto = {
        classId: CLASS_7A.id,
        subjectId: SUBJECT_B.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 20,
        isMandatory: true,
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("doit refuser si un DIRECTEUR tente sur une classe d'une autre ecole", async () => {
      const otherClass = { ...CLASS_7A, schoolId: SCHOOL_B };
      prismaMock.class.findUnique.mockResolvedValue({ ...otherClass, level: LEVEL_7A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_B);

      const dto = {
        classId: otherClass.id,
        subjectId: SUBJECT_B.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 20,
        isMandatory: true,
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================================
  // TEST 2 : Coherence annee scolaire
  // ============================================================
  describe("Validation 2 - Coherence annee scolaire", () => {
    it("doit refuser si academicYearId ne correspond pas a celui de la classe", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_7A, level: LEVEL_7A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_A);

      const dto = {
        classId: CLASS_7A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2025", // different de CLASS_7A.academicYearId
        displayOrder: 0,
        scale: 20,
        isMandatory: true,
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // TEST 3 : Coherence cycle / echelle
  // ============================================================
  describe("Validation 3 - Coherence cycle / echelle", () => {
    it("doit refuser 1er cycle avec scale=20", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_1A, level: LEVEL_1A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_A);

      const dto = {
        classId: CLASS_1A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 20, // INCORRECT pour 1er cycle
        isMandatory: true,
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("doit refuser 2e cycle avec scale=10", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_7A, level: LEVEL_7A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_A);

      const dto = {
        classId: CLASS_7A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 10, // INCORRECT pour 2e cycle
        isMandatory: true,
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // TEST 4 : Interdiction coefficient au 1er cycle
  // ============================================================
  describe("Validation 4 - Interdiction coefficient au 1er cycle", () => {
    it("doit refuser si un coefficient existe deja pour un niveau 1er cycle", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_1A, level: LEVEL_1A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_A);
      prismaMock.classSubject.findUnique.mockResolvedValue(null);
      prismaMock.subjectCoefficient.count.mockResolvedValue(1); // coefficient existe

      const dto = {
        classId: CLASS_1A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 10,
        isMandatory: true,
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // TEST 5 : Exigence coefficient au 2e cycle pour matiere obligatoire
  // ============================================================
  describe("Validation 5 - Exigence coefficient au 2e cycle", () => {
    it("doit refuser si matiere obligatoire au 2e cycle sans coefficient", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_7A, level: LEVEL_7A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_A);
      prismaMock.classSubject.findUnique.mockResolvedValue(null);
      prismaMock.subjectCoefficient.count.mockResolvedValue(0); // aucun coefficient

      const dto = {
        classId: CLASS_7A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 20,
        isMandatory: true, // matiere obligatoire
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("doit accepter si matiere facultative au 2e cycle sans coefficient", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_7A, level: LEVEL_7A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_A);
      prismaMock.classSubject.findUnique.mockResolvedValue(null);
      prismaMock.classSubject.create.mockResolvedValue({ id: "new-cs" });

      const dto = {
        classId: CLASS_7A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 20,
        isMandatory: false, // facultatif
        isActive: true,
      };

      const result = await service.create(dto, USER_DIRECTOR);
      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // TEST 6 : Anti-doublon
  // ============================================================
  describe("Validation 6 - Anti-doublon", () => {
    it("doit refuser si l'affectation existe deja", async () => {
      prismaMock.class.findUnique.mockResolvedValue({ ...CLASS_7A, level: LEVEL_7A });
      prismaMock.subject.findUnique.mockResolvedValue(SUBJECT_A);
      prismaMock.classSubject.findUnique.mockResolvedValue({
        id: "existing-cs",
      });
      prismaMock.subjectCoefficient.count.mockResolvedValue(1);

      const dto = {
        classId: CLASS_7A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2026",
        displayOrder: 0,
        scale: 20,
        isMandatory: true,
        isActive: true,
      };

      await expect(service.create(dto, USER_DIRECTOR)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ============================================================
  // TEST 7 : Soft-delete
  // ============================================================
  describe("Validation 7 - Soft-delete (jamais de delete physique)", () => {
    it("remove() doit faire un update isActive=false, pas un delete", async () => {
      const existing = {
        id: "cs-1",
        classId: CLASS_7A.id,
        subjectId: SUBJECT_A.id,
        academicYearId: "year-2026",
        class: { schoolId: SCHOOL_A },
        subject: {},
        academicYear: {},
      };
      prismaMock.classSubject.findUnique.mockResolvedValue(existing);
      prismaMock.classSubject.update.mockResolvedValue({ ...existing, isActive: false });

      const result = await service.remove("cs-1", USER_DIRECTOR);

      expect(prismaMock.classSubject.update).toHaveBeenCalledWith({
        where: { id: "cs-1" },
        data: { isActive: false },
      });
      expect(prismaMock.classSubject).not.toHaveProperty("delete");
    });
  });
});