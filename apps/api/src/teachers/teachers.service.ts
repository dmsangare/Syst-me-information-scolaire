import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string, query: any) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const where: any = { schoolId };

    // Filtre teacherType (GENERALIST / SPECIALIST)
    if (query.teacherType) where.teacherType = query.teacherType;
    if (query.status) where.status = query.status;

    // ✅ Filtre par classe/matière (utilisé par /timetable)
    if (query.classId || query.subjectId) {
      const assignmentWhere: any = {};
      if (query.classId) assignmentWhere.classId = query.classId;
      if (query.academicYearId) assignmentWhere.academicYearId = query.academicYearId;

      if (query.subjectId) {
        where.OR = [
          { assignments: { some: { ...assignmentWhere, subjectId: query.subjectId } } },
          { assignments: { some: { ...assignmentWhere, subjectId: null } } },
        ];
      } else {
        where.assignments = { some: assignmentWhere };
      }
    }

    if (query.q) {
      where.OR = [
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
        { matricule: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          assignments: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              class: { select: { id: true, name: true } },
              academicYear: { select: { id: true, label: true } },
            },
          },
          specialties: {
            include: {
              subject: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findAvailable(schoolId: string, includeLinked = false) {
    return this.prisma.teacher.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        // Si includeLinked=false → que les non-liés (comportement actuel)
        // Si includeLinked=true → tous les enseignants (pour la modale Edit)
        ...(includeLinked ? {} : { userId: null }),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        specialty: true,
        teacherType: true,
        status: true,
        userId: true, // ← NOUVEAU : pour que le front sache qui est déjà lié
      },
    });
  }

  async findOne(schoolId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId },
      include: {
        assignments: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            class: { select: { id: true, name: true } },
            academicYear: { select: { id: true, label: true } },
          },
        },
        specialties: {
          include: {
            subject: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');
    return teacher;
  }

  async create(schoolId: string, dto: any) {
    if (!dto.firstName || !dto.lastName) {
      throw new BadRequestException('Nom et prénom obligatoires');
    }

    // Determiner le teacherType
    const teacherType = dto.teacherType ?? 'GENERALIST';
    if (!['GENERALIST', 'SPECIALIST'].includes(teacherType)) {
      throw new BadRequestException('teacherType doit être GENERALIST ou SPECIALIST');
    }

    // Si GENERALIST, specialty = 'Généraliste' automatiquement
    let specialty = dto.specialty ?? null;
    if (teacherType === 'GENERALIST') {
      specialty = 'Généraliste';
    } else if (teacherType === 'SPECIALIST' && !specialty) {
      throw new BadRequestException('Un spécialiste doit avoir une specialty');
    }

    // Générer un matricule auto si non fourni
    let matricule = dto.matricule;
    if (!matricule) {
      const count = await this.prisma.teacher.count({ where: { schoolId } });
      matricule = 'ENS-' + String(count + 1).padStart(4, '0');
    }

    return this.prisma.teacher.create({
      data: {
        schoolId,
        matricule,
        firstName: dto.firstName,
        lastName: dto.lastName,
        teacherType: teacherType as any,
        gender: dto.gender ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        specialty,
        diploma: dto.diploma ?? null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        contractType: dto.contractType ?? null,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async update(schoolId: string, id: string, dto: any) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    // Verification teacherType si fourni
    let newType = dto.teacherType ?? teacher.teacherType;
    if (dto.teacherType && !['GENERALIST', 'SPECIALIST'].includes(dto.teacherType)) {
      throw new BadRequestException('teacherType doit être GENERALIST ou SPECIALIST');
    }

    let newSpecialty = dto.specialty ?? teacher.specialty;
    if (dto.teacherType === 'GENERALIST') {
      newSpecialty = 'Généraliste';
    }

    return this.prisma.teacher.update({
      where: { id },
      data: {
        firstName: dto.firstName ?? teacher.firstName,
        lastName: dto.lastName ?? teacher.lastName,
        teacherType: newType as any,
        gender: dto.gender ?? teacher.gender,
        phone: dto.phone ?? teacher.phone,
        email: dto.email ?? teacher.email,
        address: dto.address ?? teacher.address,
        specialty: newSpecialty,
        diploma: dto.diploma ?? teacher.diploma,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : teacher.hireDate,
        contractType: dto.contractType ?? teacher.contractType,
        status: dto.status ?? teacher.status,
      },
    });
  }

  async remove(schoolId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    const assignments = await this.prisma.teacherAssignment.count({ where: { teacherId: id } });
    if (assignments > 0) {
      throw new BadRequestException(
        'Impossible : ' + assignments + ' assignation(s) à retirer d\'abord',
      );
    }

    await this.prisma.teacher.delete({ where: { id } });
    return { success: true };
  }

  async assignSubject(schoolId: string, teacherId: string, dto: any) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    if (!dto.classId || !dto.academicYearId) {
      throw new BadRequestException('classId et academicYearId obligatoires');
    }

    // Regle selon teacherType
    let subjectId: string | null = dto.subjectId ?? null;
    if (teacher.teacherType === 'GENERALIST') {
      // Generaliste : pas de matiere, affectation classe entiere
      subjectId = null;
    } else if (teacher.teacherType === 'SPECIALIST') {
      // Specialiste : matiere obligatoire
      if (!subjectId) {
        throw new BadRequestException('Un spécialiste doit avoir une matière (subjectId)');
      }
    }

    // Verification anti-doublon
    const existing = await this.prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        subjectId: subjectId,
        classId: dto.classId,
        academicYearId: dto.academicYearId,
      },
    });
    if (existing) throw new BadRequestException('Assignation déjà existante');

    return this.prisma.teacherAssignment.create({
      data: {
        teacherId,
        subjectId,
        classId: dto.classId,
        academicYearId: dto.academicYearId,
        isMain: dto.isMain ?? (teacher.teacherType === 'GENERALIST'),
      },
    });
  }

  async removeAssignment(schoolId: string, teacherId: string, assignmentId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    await this.prisma.teacherAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  }

  // ============================================================
  // CRUD Specialties (TeacherSpecialty)
  // ============================================================
  async addSpecialty(schoolId: string, teacherId: string, dto: any) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    if (!dto.subjectId) {
      throw new BadRequestException('subjectId obligatoire');
    }

    // Verifier que la matiere existe
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId, isActive: true },
    });
    if (!subject) throw new NotFoundException('Matière introuvable ou inactive');

    // Anti-doublon
    const existing = await this.prisma.teacherSpecialty.findFirst({
      where: { teacherId, subjectId: dto.subjectId },
    });
    if (existing) throw new BadRequestException('Spécialité déjà existante');

    return this.prisma.teacherSpecialty.create({
      data: {
        teacherId,
        subjectId: dto.subjectId,
        isMain: dto.isMain ?? false,
      },
      include: { subject: { select: { id: true, code: true, name: true } } },
    });
  }

  async removeSpecialty(schoolId: string, teacherId: string, specialtyId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    await this.prisma.teacherSpecialty.delete({ where: { id: specialtyId } });
    return { success: true };
  }

  async getSpecialties(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    const data = await this.prisma.teacherSpecialty.findMany({
      where: { teacherId },
      include: { subject: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { data };
  }

  // ============================================================
  // Classes et matieres affectees (pour filtrage backend)
  // ============================================================
  async getAssignedClasses(schoolId: string, teacherId: string, academicYearId?: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    const where: any = { teacherId };
    if (academicYearId) where.academicYearId = academicYearId;

    const assignments = await this.prisma.teacherAssignment.findMany({
      where,
      include: {
        class: {
          include: {
            level: { select: { id: true, name: true, cycle: true } },
          },
        },
        subject: { select: { id: true, code: true, name: true } },
        academicYear: { select: { id: true, label: true } },
      },
      orderBy: { class: { name: 'asc' } },
    });

    return { data: assignments };
  }

  async getAssignedSubjects(schoolId: string, teacherId: string, academicYearId?: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    const where: any = { teacherId };
    if (academicYearId) where.academicYearId = academicYearId;

    // Recuperer les assignments
    const assignments = await this.prisma.teacherAssignment.findMany({
      where,
      include: {
        subject: { select: { id: true, code: true, name: true } },
        class: {
          include: {
            level: { select: { id: true, name: true, cycle: true } },
            classSubjects: {
              where: { isActive: true },
              include: { subject: { select: { id: true, code: true, name: true } } },
            },
          },
        },
      },
    });

    // Si GENERALIST : matieres = ClassSubject de ses classes
    // Si SPECIALIST : matieres = subjects de ses assignments
    if (teacher.teacherType === 'GENERALIST') {
      const subjectsMap = new Map();
      for (const a of assignments) {
        for (const cs of a.class.classSubjects ?? []) {
          if (!subjectsMap.has(cs.subject.id)) {
            subjectsMap.set(cs.subject.id, cs.subject);
          }
        }
      }
      return { data: Array.from(subjectsMap.values()), source: 'class_subjects' };
    } else {
      const subjectsMap = new Map();
      for (const a of assignments) {
        if (a.subject && !subjectsMap.has(a.subject.id)) {
          subjectsMap.set(a.subject.id, a.subject);
        }
      }
      return { data: Array.from(subjectsMap.values()), source: 'assignments' };
    }
  }

  async getSubjects(schoolId: string) {
    const data = await this.prisma.subject.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
    return { data };
  }

  async getClasses(schoolId: string) {
    const data = await this.prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return { data };
  }

  async getAcademicYears(schoolId: string) {
    const data = await this.prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      select: { id: true, label: true, isCurrent: true },
    });
    return { data };
  }
}