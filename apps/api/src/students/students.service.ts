import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { parseStudentsExcel, ParsedStudent } from "./utils/excel-import.util";
import { StudentCreateDto, StudentUpdateDto } from "./dto";
import { buildMatricule } from "@sis-mali/shared";
import { generateCSV } from "./utils/csv.util";
import { generateExcel } from "./utils/excel.util";
import { generatePDF } from "./utils/pdf.util";
import { generateIdCardsPDF, IdCardData } from "./utils/id-card-pdf.util";
import { PdfGeneratorService } from '../common/pdf';
import { fileToBase64 } from "../common/utils/file-to-base64.util";
import { VerificationService } from "../verification/verification.service";

type EnrollmentStatusFilter = "NOUVEAU" | "ANCIEN" | "REDOUBLANT";

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: VerificationService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  async findAll(
    schoolId: string | null,
    page = 1,
    limit = 20,
    q?: string,
    classId?: string,
    levelId?: string,
    cycle?: string,
    gender?: string,
    ageRange?: string,
    status?: string,
    enrollmentStatus?: EnrollmentStatusFilter,
    onlyNew?: boolean,
    onlyUnpaid?: boolean,
    sortField?: string,
    sortDirection?: "asc" | "desc",
    user?: { id: string; roles: string[] },
  ) {
    const where: any = { deletedAt: null };
    if (schoolId) where.schoolId = schoolId;
    if (status) where.status = status;
    if (gender) where.gender = gender;

    const isTeacherOnly =
      user &&
      user.roles.includes("TEACHER") &&
      !user.roles.includes("SUPER_ADMIN") &&
      !user.roles.includes("DIRECTOR") &&
      !user.roles.includes("SECRETARY");

    if (isTeacherOnly) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });

      if (teacher) {
        const assignments = await this.prisma.teacherAssignment.findMany({
          where: { teacherId: teacher.id },
          select: { classId: true },
        });
        const classIds = [...new Set(assignments.map((a) => a.classId))];

        where.enrollments = {
          some: {
            classId: { in: classIds },
            status: { in: ["VALIDATED", "PENDING"] },
          },
        };
      } else {
        where.id = "00000000-0000-0000-0000-000000000000";
      }
    }

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { matricule: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }

    if (ageRange) {
      const today = new Date();
      const ranges: Record<string, [number, number]> = {
        "5-7": [5, 7],
        "8-10": [8, 10],
        "11-13": [11, 13],
        "14-16": [14, 16],
        "17+": [17, 99],
      };
      const [minAge, maxAge] = ranges[ageRange] || [0, 99];
      const maxBirth = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
      const minBirth = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());
      where.birthDate = { gte: minBirth, lte: maxBirth };
    }

    if (classId || levelId || cycle) {
      where.enrollments = {
        some: {
          ...(classId ? { classId } : {}),
          ...(levelId ? { levelId } : {}),
          ...(cycle ? { level: { cycle } } : {}),
          status: { in: ["VALIDATED", "PENDING"] },
        },
      };
    }

    const skip = (page - 1) * limit;

    let orderBy: any = [{ lastName: "asc" }, { firstName: "asc" }];
    if (sortField === "matricule") orderBy = { matricule: sortDirection || "asc" };
    else if (sortField === "firstName") orderBy = { firstName: sortDirection || "asc" };
    else if (sortField === "lastName") orderBy = { lastName: sortDirection || "asc" };
    else if (sortField === "birthDate") orderBy = { birthDate: sortDirection || "asc" };
    else if (sortField === "createdAt") orderBy = { createdAt: sortDirection || "desc" };

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          guardians: {
            include: {
              guardian: {
                select: {
                  id: true, firstName: true, lastName: true, phone: true, relationType: true,
                },
              },
            },
          },
          enrollments: {
            where: { status: { in: ["VALIDATED", "PENDING"] } },
            orderBy: { enrollmentDate: "desc" },
            include: {
              class: { select: { id: true, code: true, name: true } },
              level: { select: { id: true, code: true, name: true, cycle: true } },
              academicYear: { select: { id: true, label: true } },
            },
          },
          _count: {
            select: { invoices: true, payments: true, reportCards: true },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    const studentIds = data.map((s) => s.id);
    const [statuses, unpaidAmounts] = await Promise.all([
      this.computeEnrollmentStatusesInBatch(studentIds),
      this.computeUnpaidAmountsInBatch(studentIds),
    ]);

    const enriched = data.map((student) => {
      const status = statuses.get(student.id);
      const unpaidAmount = unpaidAmounts.get(student.id) || 0;
      return {
        ...student,
        enrollmentStatus: status?.status ?? "NOUVEAU",
        yearsEnrolled: status?.yearsEnrolled ?? 0,
        isRedoublant: status?.isRedoublant ?? false,
        previousClass: status?.previousClass ?? null,
        unpaidAmount,
      };
    });

    let filtered = enriched;
    if (enrollmentStatus) {
      filtered = enriched.filter((s) => s.enrollmentStatus === enrollmentStatus);
    }
    if (onlyNew) {
      filtered = enriched.filter((s) => s.enrollmentStatus === "NOUVEAU");
    }
    if (onlyUnpaid) {
      filtered = filtered.filter((s) => s.unpaidAmount > 0);
    }

    return {
      data: filtered,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  private async computeEnrollmentStatus(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: "VALIDATED" },
      orderBy: { enrollmentDate: "desc" },
      include: {
        class: { select: { code: true, name: true } },
        level: { select: { id: true, code: true, name: true } },
        academicYear: { select: { id: true, label: true, isCurrent: true } },
      },
    });

    if (enrollments.length === 0) {
      return { status: "NOUVEAU" as EnrollmentStatusFilter, yearsEnrolled: 0, isRedoublant: false, previousClass: null };
    }

    const currentEnrollment = enrollments.find((e) => e.academicYear.isCurrent);
    const previousEnrollments = enrollments.filter((e) => !e.academicYear.isCurrent);

    if (!currentEnrollment) {
      return { status: "ANCIEN" as EnrollmentStatusFilter, yearsEnrolled: enrollments.length, isRedoublant: false, previousClass: null };
    }

    if (previousEnrollments.length === 0) {
      return {
        status: "NOUVEAU" as EnrollmentStatusFilter,
        yearsEnrolled: 1,
        isRedoublant: false,
        previousClass: null,
      };
    }

    const lastPrevious = previousEnrollments[0];
    const isRedoublant = lastPrevious.levelId === currentEnrollment.levelId;

    return {
      status: isRedoublant ? ("REDOUBLANT" as EnrollmentStatusFilter) : ("ANCIEN" as EnrollmentStatusFilter),
      yearsEnrolled: enrollments.length,
      isRedoublant,
      previousClass: lastPrevious.class?.name || null,
    };
  }

  private async computeEnrollmentStatusesInBatch(
    studentIds: string[],
  ): Promise<
    Map<
      string,
      {
        status: EnrollmentStatusFilter;
        yearsEnrolled: number;
        isRedoublant: boolean;
        previousClass: string | null;
      }
    >
  > {
    const result = new Map();

    if (studentIds.length === 0) return result;

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: { in: studentIds },
        status: "VALIDATED",
      },
      orderBy: [{ studentId: "asc" }, { enrollmentDate: "desc" }],
      select: {
        studentId: true,
        levelId: true,
        academicYearId: true,
        enrollmentDate: true,
        class: { select: { name: true } },
        academicYear: { select: { isCurrent: true } },
      },
    });

    const byStudent = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      if (!byStudent.has(e.studentId)) byStudent.set(e.studentId, []);
      byStudent.get(e.studentId)!.push(e);
    }

    for (const studentId of studentIds) {
      const studentEnrollments = byStudent.get(studentId) || [];

      if (studentEnrollments.length === 0) {
        result.set(studentId, {
          status: "NOUVEAU" as EnrollmentStatusFilter,
          yearsEnrolled: 0,
          isRedoublant: false,
          previousClass: null,
        });
        continue;
      }

      const currentEnrollment = studentEnrollments.find(
        (e) => e.academicYear.isCurrent,
      );
      const previousEnrollments = studentEnrollments.filter(
        (e) => !e.academicYear.isCurrent,
      );

      if (!currentEnrollment) {
        result.set(studentId, {
          status: "ANCIEN" as EnrollmentStatusFilter,
          yearsEnrolled: studentEnrollments.length,
          isRedoublant: false,
          previousClass: null,
        });
        continue;
      }

      if (previousEnrollments.length === 0) {
        result.set(studentId, {
          status: "NOUVEAU" as EnrollmentStatusFilter,
          yearsEnrolled: 1,
          isRedoublant: false,
          previousClass: null,
        });
        continue;
      }

      const lastPrevious = previousEnrollments[0];
      const isRedoublant = lastPrevious.levelId === currentEnrollment.levelId;

      result.set(studentId, {
        status: isRedoublant
          ? ("REDOUBLANT" as EnrollmentStatusFilter)
          : ("ANCIEN" as EnrollmentStatusFilter),
        yearsEnrolled: studentEnrollments.length,
        isRedoublant,
        previousClass: lastPrevious.class?.name || null,
      });
    }

    return result;
  }

  private async computeUnpaidAmountsInBatch(
    studentIds: string[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const id of studentIds) result.set(id, 0);

    if (studentIds.length === 0) return result;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        studentId: { in: studentIds },
        status: { not: "CANCELLED" },
      },
      select: { studentId: true, balance: true },
    });

    for (const inv of invoices) {
      const current = result.get(inv.studentId) || 0;
      result.set(inv.studentId, current + Number(inv.balance));
    }

    return result;
  }

  private async computeUnpaidAmount(studentId: string): Promise<number> {
    const invoices = await this.prisma.invoice.findMany({
      where: { studentId, status: { not: "CANCELLED" } },
      select: { balance: true },
    });
    return invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        guardians: {
          include: { guardian: true },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
        enrollments: {
          orderBy: { enrollmentDate: "desc" },
          include: {
            class: { select: { id: true, code: true, name: true } },
            level: { select: { id: true, code: true, name: true, cycle: true } },
            academicYear: { select: { id: true, label: true } },
          },
        },
        pathways: {
          orderBy: { createdAt: "desc" },
          include: {
            class: { select: { id: true, code: true, name: true } },
            level: { select: { id: true, code: true, name: true } },
            academicYear: { select: { id: true, label: true } },
          },
        },
        invoices: {
          orderBy: { issuedAt: "desc" },
          take: 10,
          select: { id: true, number: true, totalAmount: true, paidAmount: true, balance: true, status: true, issuedAt: true },
        },
        _count: {
          select: { invoices: true, payments: true, reportCards: true },
        },
      },
    });
    if (!student || student.deletedAt) throw new NotFoundException("Eleve introuvable");

    const enrollmentStatus = await this.computeEnrollmentStatus(id);
    const unpaidAmount = await this.computeUnpaidAmount(id);

    return {
      ...student,
      enrollmentStatus: enrollmentStatus.status,
      yearsEnrolled: enrollmentStatus.yearsEnrolled,
      isRedoublant: enrollmentStatus.isRedoublant,
      unpaidAmount,
    };
  }

  private async getSchoolSigle(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { sigle: true },
    });
    return (school?.sigle || "SIS").toUpperCase();
  }

  private async nextMatricule(schoolId: string): Promise<string> {
    const sigle = await this.getSchoolSigle(schoolId);
    const year = new Date().getFullYear();
    const prefix = `${sigle}-${year}-`;

    const last = await this.prisma.student.findFirst({
      where: { schoolId, matricule: { startsWith: prefix } },
      orderBy: { matricule: "desc" },
      select: { matricule: true },
    });

    const lastNum = last?.matricule
      ? parseInt(last.matricule.split("-").pop() || "0", 10)
      : 0;

    return buildMatricule(sigle, year, lastNum + 1);
  }

  async create(dto: StudentCreateDto, createdBy: string) {
    const matricule = await this.nextMatricule(dto.schoolId);

    const existing = await this.prisma.student.findUnique({
      where: { schoolId_matricule: { schoolId: dto.schoolId, matricule } },
    });
    if (existing) {
      throw new ConflictException("Conflit de matricule, veuillez reessayer");
    }

    return this.prisma.student.create({
      data: {
        ...dto,
        matricule,
        birthDate: new Date(dto.birthDate),
        status: (dto.status || "ACTIVE") as any,
        gender: dto.gender as any,
      } as any,
    });
  }

  async update(id: string, dto: StudentUpdateDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    return this.prisma.student.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DROPPED" },
    });
  }

  async getStats(
    schoolId: string | null,
    user?: { id: string; roles: string[] },
  ) {
    const where: any = { deletedAt: null };
    if (schoolId) where.schoolId = schoolId;

    const isTeacherOnly =
      user &&
      user.roles.includes("TEACHER") &&
      !user.roles.includes("SUPER_ADMIN") &&
      !user.roles.includes("DIRECTOR") &&
      !user.roles.includes("SECRETARY");

    if (isTeacherOnly && user) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });

      if (teacher) {
        const assignments = await this.prisma.teacherAssignment.findMany({
          where: { teacherId: teacher.id },
          select: { classId: true },
        });
        const classIds = [...new Set(assignments.map((a) => a.classId))];

        where.enrollments = {
          some: {
            classId: { in: classIds },
            status: { in: ["VALIDATED", "PENDING"] },
          },
        };
      } else {
        where.id = "00000000-0000-0000-0000-000000000000";
      }
    }

    const allStudents = await this.prisma.student.findMany({
      where,
      select: { id: true, gender: true },
    });

    const total = allStudents.length;
    const boys = allStudents.filter((s) => s.gender === "M").length;
    const girls = total - boys;

    const statuses = await this.computeEnrollmentStatusesInBatch(
      allStudents.map((s) => s.id),
    );
    let newCount = 0, ancienCount = 0, redoublantCount = 0;
    for (const s of allStudents) {
      const status = statuses.get(s.id);
      if (status?.status === "NOUVEAU") newCount++;
      else if (status?.status === "REDOUBLANT") redoublantCount++;
      else ancienCount++;
    }

    const byCycle = await this.prisma.enrollment.groupBy({
      by: ["levelId"],
      where: {
        student: where,
        status: { in: ["VALIDATED", "PENDING"] },
      },
      _count: true,
    });

    const levelIds = byCycle.map((b) => b.levelId);
    const levels = await this.prisma.level.findMany({
      where: { id: { in: levelIds } },
      select: { id: true, code: true, name: true, cycle: true },
    });

    const cycleCounts: Record<string, number> = {};
    for (const b of byCycle) {
      const level = levels.find((l) => l.id === b.levelId);
      if (!level) continue;
      cycleCounts[level.cycle] = (cycleCounts[level.cycle] || 0) + b._count;
    }

    return {
      total,
      boys,
      girls,
      newCount,
      ancienCount,
      redoublantCount,
      byCycle: Object.entries(cycleCounts).map(([cycle, count]) => ({ cycle, count })),
    };
  }

  async getPathway(id: string) {
    await this.findOne(id);
    return this.prisma.studentPathway.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      include: {
        academicYear: { select: { id: true, label: true } },
        level: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async getDocuments(id: string) {
    await this.findOne(id);
    return this.prisma.studentDocument.findMany({
      where: { studentId: id },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async addDocument(
    studentId: string,
    documentData: {
      type: string;
      fileUrl: string;
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
    },
    uploadedBy: string,
  ) {
    await this.findOne(studentId);
    return this.prisma.studentDocument.create({
      data: {
        studentId,
        type: documentData.type as any,
        fileUrl: documentData.fileUrl,
        fileName: documentData.fileName,
        mimeType: documentData.mimeType,
        sizeBytes: documentData.sizeBytes,
        uploadedBy,
      },
    });
  }

  async removeDocument(studentId: string, documentId: string) {
    await this.findOne(studentId);
    return this.prisma.studentDocument.delete({ where: { id: documentId } });
  }

  async exportCSV(
    schoolId: string | null,
    classId?: string,
    levelId?: string,
    status?: string,
    enrollmentStatus?: EnrollmentStatusFilter,
  ): Promise<string> {
    const where: any = { deletedAt: null };
    if (schoolId) where.schoolId = schoolId;
    if (status) where.status = status;

    if (classId || levelId) {
      where.enrollments = {
        some: {
          ...(classId ? { classId } : {}),
          ...(levelId ? { levelId } : {}),
          status: { in: ["VALIDATED", "PENDING"] },
        },
      };
    }

    const students = await this.prisma.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        guardians: {
          include: {
            guardian: {
              select: {
                firstName: true, lastName: true, phone: true, relationType: true,
              },
            },
          },
        },
        enrollments: {
          where: { status: { in: ["VALIDATED", "PENDING"] } },
          orderBy: { enrollmentDate: "desc" },
          take: 1,
          include: {
            class: { select: { name: true } },
            level: { select: { name: true, cycle: true } },
          },
        },
      },
    });

    let filtered = students;
    if (enrollmentStatus) {
      const statuses = await this.computeEnrollmentStatusesInBatch(
        students.map((s) => s.id),
      );
      filtered = students.filter(
        (s) => statuses.get(s.id)?.status === enrollmentStatus,
      );
    }

    const headers = [
      "Matricule",
      "Nom",
      "Prenom",
      "Sexe",
      "Date de naissance",
      "Lieu de naissance",
      "Nationalite",
      "Telephone",
      "Classe",
      "Niveau",
      "Cycle",
      "Statut",
      "Tuteur principal",
      "Telephone tuteur",
    ];

    const rows = filtered.map((s) => {
      const primaryGuardian = s.guardians.find((g) => g.isPrimary) || s.guardians[0];
      const enrollment = s.enrollments[0];
      return [
        s.matricule,
        s.lastName,
        s.firstName,
        s.gender === "M" ? "Masculin" : "Feminin",
        s.birthDate ? new Date(s.birthDate).toLocaleDateString("fr-FR") : "",
        s.birthPlace || "",
        s.nationality || "",
        s.phone || "",
        enrollment?.class?.name || "",
        enrollment?.level?.name || "",
        enrollment?.level?.cycle || "",
        s.status,
        primaryGuardian ? `${primaryGuardian.guardian.lastName} ${primaryGuardian.guardian.firstName}` : "",
        primaryGuardian?.guardian.phone || "",
      ];
    });

    return generateCSV(headers, rows);
  }

  async exportExcel(
    schoolId: string | null,
    schoolName: string,
    classId?: string,
    levelId?: string,
    status?: string,
    enrollmentStatus?: EnrollmentStatusFilter,
  ): Promise<Buffer> {
    const students = await this.getStudentsForExport(schoolId, classId, levelId, status, enrollmentStatus);

    const columns = [
      { header: "Matricule", key: "matricule", width: 18 },
      { header: "Nom", key: "lastName", width: 15 },
      { header: "Prenom", key: "firstName", width: 15 },
      { header: "Sexe", key: "gender", width: 10 },
      { header: "Date naissance", key: "birthDate", width: 15 },
      { header: "Lieu naissance", key: "birthPlace", width: 15 },
      { header: "Nationalite", key: "nationality", width: 12 },
      { header: "Telephone", key: "phone", width: 18 },
      { header: "Classe", key: "className", width: 12 },
      { header: "Niveau", key: "levelName", width: 18 },
      { header: "Statut", key: "status", width: 12 },
      { header: "Tuteur", key: "guardianName", width: 22 },
      { header: "Tel. tuteur", key: "guardianPhone", width: 18 },
    ];

    const data = students.map((s) => {
      const primaryGuardian = s.guardians.find((g) => g.isPrimary) || s.guardians[0];
      const enrollment = s.enrollments[0];
      return {
        matricule: s.matricule,
        lastName: s.lastName,
        firstName: s.firstName,
        gender: s.gender === "M" ? "Masculin" : "Feminin",
        birthDate: s.birthDate ? new Date(s.birthDate).toLocaleDateString("fr-FR") : "",
        birthPlace: s.birthPlace || "",
        nationality: s.nationality || "",
        phone: s.phone || "",
        className: enrollment?.class?.name || "",
        levelName: enrollment?.level?.name || "",
        status: s.status,
        guardianName: primaryGuardian
          ? `${primaryGuardian.guardian.lastName} ${primaryGuardian.guardian.firstName}`
          : "",
        guardianPhone: primaryGuardian?.guardian.phone || "",
      };
    });

    return generateExcel({
      title: "Liste des eleves",
      subtitle: `${data.length} eleve(s) — Annee scolaire ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      sheetName: "Eleves",
      schoolName,
      columns,
      data,
    });
  }

  async exportPDF(
    schoolId: string | null,
    schoolName: string,
    schoolAddress: string | undefined,
    classId?: string,
    levelId?: string,
    status?: string,
    enrollmentStatus?: EnrollmentStatusFilter,
  ): Promise<Buffer> {
    const students = await this.getStudentsForExport(schoolId, classId, levelId, status, enrollmentStatus);

    const columns = [
      { header: "Matricule", key: "matricule", width: "14%" },
      { header: "Nom et prenom", key: "fullName", width: "22%" },
      { header: "Sexe", key: "gender", width: "8%" },
      { header: "Naissance", key: "birthDate", width: "12%" },
      { header: "Classe", key: "className", width: "10%" },
      { header: "Tuteur", key: "guardianName", width: "20%" },
      { header: "Telephone", key: "guardianPhone", width: "14%" },
    ];

    const data = students.map((s) => {
      const primaryGuardian = s.guardians.find((g) => g.isPrimary) || s.guardians[0];
      const enrollment = s.enrollments[0];
      return {
        matricule: s.matricule,
        fullName: `${s.lastName} ${s.firstName}`,
        gender: s.gender === "M" ? "M" : "F",
        birthDate: s.birthDate ? new Date(s.birthDate).toLocaleDateString("fr-FR") : "",
        className: enrollment?.class?.name || "",
        guardianName: primaryGuardian
          ? `${primaryGuardian.guardian.lastName} ${primaryGuardian.guardian.firstName}`
          : "",
        guardianPhone: primaryGuardian?.guardian.phone || "",
      };
    });

    return generatePDF({
      title: "LISTE DES ELEVES",
      subtitle: `${data.length} eleve(s) — Genere le ${new Date().toLocaleDateString("fr-FR")}`,
      schoolName,
      schoolAddress,
      columns,
      data,
      footerNote: "Document genere automatiquement par SIS-MALI — Signature et cachet du directeur",
    }, this.pdfGenerator);
  }

  private async getStudentsForExport(
    schoolId: string | null,
    classId?: string,
    levelId?: string,
    status?: string,
    enrollmentStatus?: EnrollmentStatusFilter,
  ) {
    const where: any = { deletedAt: null };
    if (schoolId) where.schoolId = schoolId;
    if (status) where.status = status;

    if (classId || levelId) {
      where.enrollments = {
        some: {
          ...(classId ? { classId } : {}),
          ...(levelId ? { levelId } : {}),
          status: { in: ["VALIDATED", "PENDING"] },
        },
      };
    }

    const students = await this.prisma.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        guardians: {
          include: {
            guardian: {
              select: {
                firstName: true, lastName: true, phone: true, relationType: true,
              },
            },
          },
        },
        enrollments: {
          where: { status: { in: ["VALIDATED", "PENDING"] } },
          orderBy: { enrollmentDate: "desc" },
          take: 1,
          include: {
            class: { select: { name: true } },
            level: { select: { name: true, cycle: true } },
          },
        },
      },
    });

    if (!enrollmentStatus) return students;

    const statuses = await this.computeEnrollmentStatusesInBatch(
      students.map((s) => s.id),
    );
    return students.filter(
      (s) => statuses.get(s.id)?.status === enrollmentStatus,
    );
  }

  async getSiblings(studentId: string) {
    const studentGuardians = await this.prisma.studentGuardian.findMany({
      where: { studentId },
      select: { guardianId: true },
    });

    if (studentGuardians.length === 0) return [];

    const guardianIds = studentGuardians.map((sg) => sg.guardianId);

    const siblings = await this.prisma.studentGuardian.findMany({
      where: {
        guardianId: { in: guardianIds },
        studentId: { not: studentId },
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: { in: ["VALIDATED", "PENDING"] } },
              orderBy: { enrollmentDate: "desc" },
              take: 1,
              include: {
                class: { select: { id: true, code: true, name: true } },
                level: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });

    const uniqueMap = new Map();
    for (const rel of siblings) {
      if (!uniqueMap.has(rel.student.id)) {
        uniqueMap.set(rel.student.id, {
          id: rel.student.id,
          matricule: rel.student.matricule,
          firstName: rel.student.firstName,
          lastName: rel.student.lastName,
          gender: rel.student.gender,
          birthDate: rel.student.birthDate,
          status: rel.student.status,
          enrollments: rel.student.enrollments,
        });
      }
    }

    return Array.from(uniqueMap.values());
  }

  async importPreview(buffer: Buffer, schoolId: string) {
    const { rows, classesTrouvees } = await parseStudentsExcel(buffer);

    const totalRows = rows.length;
    const validRows = rows.filter((r) => r.data !== null);
    const errorRows = rows.filter((r) => r.errors.length > 0);

    const doublons: Array<{ lineNumber: number; raison: string; nom: string }> = [];

    for (const row of validRows) {
      if (!row.data) continue;
      const d = row.data;

      let existing = null;

      if (d.matricule) {
        existing = await this.prisma.student.findFirst({
          where: { schoolId, matricule: d.matricule },
        });
      }

      if (!existing) {
        existing = await this.prisma.student.findFirst({
          where: {
            schoolId,
            lastName: { equals: d.lastName, mode: "insensitive" },
            firstName: { equals: d.firstName, mode: "insensitive" },
            birthDate: d.birthDate!,
          },
        });
      }

      if (existing) {
        doublons.push({
          lineNumber: row.lineNumber,
          raison: "Eleve deja existant dans la base",
          nom: `${d.lastName} ${d.firstName}`,
        });
        row.errors.push("Doublon : eleve deja existant");
        row.data = null;
      }
    }

    const parClasse: Record<string, number> = {};
    for (const row of validRows) {
      if (row.data) {
        parClasse[row.data.className] = (parClasse[row.data.className] || 0) + 1;
      }
    }

    return {
      totalRows,
      validCount: rows.filter((r) => r.data !== null).length,
      errorCount: rows.filter((r) => r.errors.length > 0).length,
      doublonCount: doublons.length,
      classesTrouvees: Array.from(classesTrouvees),
      elevesParClasse: parClasse,
      rows: rows.slice(0, 200),
      doublons,
    };
  }

  async importConfirm(
    students: ParsedStudent[],
    schoolId: string,
    userId: string,
  ) {
    const results = {
      created: 0,
      classesCreated: 0,
      guardiansCreated: 0,
      errors: [] as Array<{ nom: string; error: string }>,
    };

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!academicYear) {
      throw new Error("Aucune annee scolaire active");
    }

    const levels = await this.prisma.level.findMany({
      where: { schoolId },
    });

    const existingClasses = await this.prisma.class.findMany({
      where: { schoolId, academicYearId: academicYear.id },
      include: { level: true },
    });

    const classMap = new Map<string, string>();
    existingClasses.forEach((c) => {
      classMap.set(c.name.toLowerCase().trim(), c.id);
    });

    for (const s of students) {
      try {
        const classKey = s.className.toLowerCase().trim();
        let classId = classMap.get(classKey);

        if (!classId) {
          const levelPart = s.className.replace(/\s+[A-Z]$/i, "").trim();

          let level = levels.find(
            (l) => l.name.toLowerCase().trim() === levelPart.toLowerCase().trim(),
          );

          if (!level && levels.length > 0) {
            level = levels[0];
          }

          if (!level) {
            throw new Error(`Aucun niveau disponible pour creer la classe ${s.className}`);
          }

          const newClass = await this.prisma.class.create({
            data: {
              schoolId,
              academicYearId: academicYear.id,
              levelId: level.id,
              name: s.className,
              code: s.className.toUpperCase().replace(/\s+/g, ""),
              capacity: 50,
            },
          });

          classId = newClass.id;
          classMap.set(classKey, classId);
          results.classesCreated++;
        }

        const student = await this.prisma.student.create({
          data: {
            schoolId,
            matricule: s.matricule || await this.nextMatricule(schoolId),
            firstName: s.firstName,
            lastName: s.lastName,
            gender: s.gender!,
            birthDate: s.birthDate!,
            birthPlace: s.birthPlace || null,
            nationality: "Malienne",
            address: s.address || null,
            status: "ACTIVE",
          },
        });

        const guardiansToCreate: Array<{
          lastName: string;
          firstName: string;
          phone: string;
          relation: "FATHER" | "MOTHER" | "TUTOR";
        }> = [];

        if (s.fatherLastName && s.fatherPhone) {
          guardiansToCreate.push({
            lastName: s.fatherLastName,
            firstName: s.fatherFirstName || "",
            phone: s.fatherPhone,
            relation: "FATHER",
          });
        }
        if (s.motherLastName && s.motherPhone) {
          guardiansToCreate.push({
            lastName: s.motherLastName,
            firstName: s.motherFirstName || "",
            phone: s.motherPhone,
            relation: "MOTHER",
          });
        }
        if (
          s.guardianLastName &&
          s.guardianPhone &&
          guardiansToCreate.length === 0
        ) {
          guardiansToCreate.push({
            lastName: s.guardianLastName,
            firstName: s.guardianFirstName || "",
            phone: s.guardianPhone,
            relation: "TUTOR",
          });
        }

        for (let i = 0; i < guardiansToCreate.length; i++) {
          const g = guardiansToCreate[i];
          let guardian = await this.prisma.guardian.findFirst({
            where: { schoolId, phone: g.phone },
          });

          if (!guardian) {
            guardian = await this.prisma.guardian.create({
              data: {
                schoolId,
                firstName: g.firstName || g.lastName,
                lastName: g.lastName,
                phone: g.phone,
                relationType: g.relation as any,
              },
            });
            results.guardiansCreated++;
          }

          await this.prisma.studentGuardian.create({
            data: {
              studentId: student.id,
              guardianId: guardian.id,
              isPrimary: i === 0,
            },
          });
        }

        await this.prisma.enrollment.create({
          data: {
            studentId: student.id,
            academicYearId: academicYear.id,
            classId: classId,
            levelId: (await this.prisma.class.findUnique({ where: { id: classId } }))!.levelId,
            enrollmentDate: new Date(),
            status: s.enrollmentStatus === "EN_ATTENTE" ? "PENDING" : "VALIDATED",
          },
        });

        results.created++;
      } catch (err: any) {
        results.errors.push({
          nom: `${s.lastName} ${s.firstName}`,
          error: err.message || "Erreur inconnue",
        });
      }
    }

    return results;
  }

  async generateIdCardsBatch(
    schoolId: string,
    options: {
      classId?: string;
      studentIds?: string[];
      format: "A4" | "PVC";
      includeVerso: boolean;
    },
  ): Promise<Buffer> {
    if (!options.classId && (!options.studentIds || options.studentIds.length === 0)) {
      throw new BadRequestException("Fournir soit classId, soit studentIds[]");
    }

    let klassName = "";
    let students: Array<{
      id: string;
      matricule: string;
      firstName: string;
      lastName: string;
      gender: string;
      birthDate: Date;
      photoUrl: string | null;
    }> = [];

    if (options.classId) {
      const klass = await this.prisma.class.findFirst({
        where: { id: options.classId, schoolId },
        include: {
          enrollments: {
            where: { status: "VALIDATED" },
            include: {
              student: {
                select: {
                  id: true,
                  matricule: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                  birthDate: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
      });
      if (!klass) throw new NotFoundException("Classe introuvable");
      klassName = klass.name;
      students = klass.enrollments.map((e) => e.student);
    } else {
      const found = await this.prisma.student.findMany({
        where: { id: { in: options.studentIds! }, schoolId, deletedAt: null },
        select: {
          id: true,
          matricule: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          photoUrl: true,
          enrollments: {
            where: { status: "VALIDATED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { class: { select: { name: true } } },
          },
        },
      });
      students = found.map((s) => ({
        id: s.id,
        matricule: s.matricule,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        birthDate: s.birthDate,
        photoUrl: s.photoUrl,
      }));
    }

    if (students.length === 0) {
      throw new BadRequestException("Aucun eleve trouve");
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        sigle: true,
        logoUrl: true,
        address: true,
        phone: true,
        motto: true,
      },
    });
    if (!school) throw new NotFoundException("Ecole introuvable");

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { label: true },
    });
    const academicYearLabel = currentYear?.label || "";

    const QRCode = await import("qrcode");

    const schoolLogoBase64 = await fileToBase64(school.logoUrl);

    const cards: IdCardData[] = [];
    for (const st of students) {
      const signed = await this.verification.sign({
        schoolId,
        type: "ID_CARD",
        referenceId: st.id,
        meta: {
          matricule: st.matricule,
          nom: `${st.lastName} ${st.firstName}`,
          classe: klassName,
        },
      });

      const verifyUrl = this.verification.buildQrPayload(
        signed.shortCode,
        signed.hmacToken,
      );
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      cards.push({
        schoolName: school.name,
        schoolSigle: school.sigle,
        schoolLogoBase64,
        schoolAddress: school.address,
        schoolPhone: school.phone,
        schoolMotto: school.motto,
        academicYearLabel,
        student: {
          id: st.id,
          matricule: st.matricule,
          firstName: st.firstName,
          lastName: st.lastName,
          gender: st.gender,
          birthDate: st.birthDate,
          className: klassName,
          photoUrl: await fileToBase64(st.photoUrl),
        },
        qrDataUrl,
        verifyUrl,
      });
    }

    const pdf = await generateIdCardsPDF(cards, options, this.pdfGenerator);

    await this.prisma.student.updateMany({
      where: { id: { in: students.map((s) => s.id) } },
      data: { idCardGeneratedAt: new Date() },
    });

    return pdf;
  }

  /**
   * Récupère la fiche élève liée à un compte utilisateur (via userId).
   * Utilisé par GET /students/me pour les élèves connectés.
   */
  async findByUserId(schoolId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { schoolId, userId, deletedAt: null },
      include: {
        enrollments: {
          where: { status: "VALIDATED" },
          orderBy: { enrollmentDate: "desc" },
          take: 1,
          include: {
            class: { select: { id: true, name: true } },
            level: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!student) return null;

    const enrollment = student.enrollments[0];

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      matricule: student.matricule,
      classId: enrollment?.class?.id ?? null,
      className: enrollment?.class?.name ?? null,
      levelId: enrollment?.level?.id ?? null,
      levelName: enrollment?.level?.name ?? null,
    };
  }
}