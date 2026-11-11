import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FeeStructureCreateDto } from "./dto";

@Injectable()
export class FeeStructuresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolId: string | null, academicYearId?: string, levelId?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (levelId) where.levelId = levelId;

    return this.prisma.feeStructure.findMany({
      where,
      orderBy: [{ academicYear: { startDate: "desc" } }, { level: { orderIndex: "asc" } }],
      include: {
        feeType: true,
        level: { select: { id: true, code: true, name: true, cycle: true } },
        academicYear: { select: { id: true, label: true } },
      },
    });
  }

  async findOne(id: string) {
    const structure = await this.prisma.feeStructure.findUnique({
      where: { id },
      include: { feeType: true, level: true, academicYear: true },
    });
    if (!structure) throw new NotFoundException("Structure tarifaire introuvable");
    return structure;
  }

  async create(dto: FeeStructureCreateDto) {
    return this.prisma.feeStructure.create({
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        levelId: dto.levelId || null,
      } as any,
      include: {
        feeType: true,
        level: true,
      },
    });
  }

  async update(id: string, dto: Partial<FeeStructureCreateDto>) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    return this.prisma.feeStructure.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.feeStructure.delete({ where: { id } });
  }

  /**
   * Recupere toute la grille tarifaire applicable a un eleve
   * (via sa classe et son niveau) pour une annee scolaire.
   */
  async getForLevel(schoolId: string, academicYearId: string, levelId: string) {
    return this.prisma.feeStructure.findMany({
      where: { schoolId, academicYearId, OR: [{ levelId }, { levelId: null }] },
      include: { feeType: true },
      orderBy: { feeType: { category: "asc" } },
    });
  }

  async getCoverage(schoolId: string, academicYearId: string) {
    const levels = await this.prisma.level.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, code: true, name: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    });
    const coveredRows = await this.prisma.feeStructure.findMany({
      where: { schoolId, academicYearId, levelId: { not: null } },
      select: { levelId: true },
      distinct: ["levelId"],
    });
    const coveredIds = new Set(coveredRows.map((r) => r.levelId as string));
    const enrollments = await this.prisma.enrollment.findMany({
      where: { academicYearId, student: { schoolId } },
      select: { levelId: true },
    });
    const studentsByLevel = new Map<string, number>();
    for (const e of enrollments) {
      if (!e.levelId) continue;
      studentsByLevel.set(e.levelId, (studentsByLevel.get(e.levelId) ?? 0) + 1);
    }
    const levelsMissingGrid = levels
      .filter((l) => !coveredIds.has(l.id))
      .map((l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        studentsCount: studentsByLevel.get(l.id) || 0,
      }))
      .filter((l) => l.studentsCount > 0);
    const totalStudentsAffected = levelsMissingGrid.reduce(
      (sum, l) => sum + l.studentsCount, 0,
    );
    return {
      academicYearId,
      levelsTotal: levels.length,
      levelsWithGrid: levels.length - levelsMissingGrid.length,
      levelsMissingGrid,
      totalStudentsAffected,
      isReadyForBulk: levelsMissingGrid.length === 0,
    };
  }
}
