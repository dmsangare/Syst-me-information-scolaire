import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as fsSync from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { generateReportCardPDF } from '../utils/report-card-pdf.util';
import { generateAnnualReportCardPDF } from '../utils/annual-report-card-pdf.util';
import { PdfGeneratorService } from '../../common/pdf';

type JobStatus = 'pending' | 'processing' | 'done' | 'failed';
interface Job {
  status: JobStatus;
  progress: number;
  zipPath?: string;
  error?: string;
  count?: number;
  createdAt: number;
}

@Injectable()
export class ClassPdfService {
  private readonly logger = new Logger(ClassPdfService.name);
  private readonly jobs = new Map<string, Job>();
  private readonly jobsDir = '/app/storage/generated';

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
  }

  async createJob(classId: string, academicYearId: string, termId: string | undefined, kind: string, schoolId?: string): Promise<string> {
    const jobId = randomUUID();
    this.jobs.set(jobId, { status: 'pending', progress: 0, createdAt: Date.now() });

    // Lancer sans attendre
    this.processJob(jobId, classId, academicYearId, termId, kind, schoolId).catch((err) => {
      this.logger.error(`[ClassPdf ${jobId}] ${err.message}`);
      this.jobs.set(jobId, { status: 'failed', progress: 0, error: err.message, createdAt: Date.now() });
    });

    return jobId;
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  private async processJob(jobId: string, classId: string, academicYearId: string, termId: string | undefined, kind: string, schoolId?: string) {
    this.jobs.set(jobId, { status: 'processing', progress: 5, createdAt: Date.now() });

    const where: any = { classId, academicYearId };
    if (termId) where.termId = termId;
    if (schoolId) where.student = { schoolId };

    const reports = await this.prisma.reportCard.findMany({
      where,
      include: {
        student: true,
        class: { include: { level: true } },
        term: true,
        academicYear: true,
        items: { include: { subject: true } },
      },
    });

    if (reports.length === 0) {
      this.jobs.set(jobId, { status: 'done', progress: 100, count: 0, createdAt: Date.now() });
      return;
    }

    const zipPath = path.join(this.jobsDir, `class-${classId}-${jobId}.zip`);
    const output = fsSync.createWriteStream(zipPath);
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);

    let processed = 0;
    for (const report of reports) {
      try {
        // C4 : charger le nom réel de l'école
        const school = await this.prisma.school.findUnique({
          where: { id: report.student.schoolId },
          select: { name: true, address: true, phone: true, motto: true, logoUrl: true, stampUrl: true, academy: true, cap: true },
        });
        const schoolName = school?.name ?? 'SIS-MALI';

        const data: any = {
          // C4 : nom réel de l'école
          schoolName,
          schoolAddress: school?.address ?? null,
          schoolPhone: school?.phone ?? null,
          schoolMotto: school?.motto ?? null,
          schoolLogoUrl: school?.logoUrl ?? null,
          schoolStampBase64: null,
          schoolAcademy: school?.academy ?? null,
          schoolCap: school?.cap ?? null,

          studentName: `${report.student.lastName} ${report.student.firstName}`,
          studentMatricule: report.student.matricule,
          studentGender: report.student.gender,
          studentBirthDate: report.student.birthDate.toISOString().split('T')[0],
          studentBirthPlace: report.student.birthPlace,
          className: report.class?.name || '',
          classSize: report.classSize || 0,
          termName: report.term?.name || '',
          academicYear: report.academicYear?.label || '',
          items: report.items.map((i) => ({
            subjectName: i.subject?.name || '',
            coefficient: Number(i.coefficient),
            average: i.average !== null ? Number(i.average) : null,
            weighted: i.weighted !== null ? Number(i.weighted) : null,
            rank: i.rank,
          })),
          totalCoefficient: report.items.reduce((s, i) => s + Number(i.coefficient), 0),
          totalWeighted: report.items.reduce((s, i) => s + (Number(i.weighted) || 0), 0),
          generalAverage: report.average !== null ? Number(report.average) : null,
          rank: report.rank,
          scale: report.scale,
          // C2 : corriger les noms de champs
          absencesCount: report.absencesCount,
          latesCount: report.latesCount,
          // C3 : exposer decision et appreciation
          decision: report.decision ?? null,
          appreciation: report.appreciation ?? null,

          // C1 : champs pour le PDF annuel
          cycle: report.class?.level?.cycle === 'PREMIER_CYCLE' ? 'PREMIER_CYCLE' : 'DEUXIEME_CYCLE',
          terms: undefined,        // rempli ci-dessous si annuel
          compositions: undefined, // rempli ci-dessous si annuel
          annualSum: undefined,
          annualAverage: undefined,
          decisionLabel: undefined,
        };

        // C1 : si annuel, charger les périodes
        if (kind === 'ANNUEL' || report.kind === 'ANNUEL') {
          const cycle = data.cycle;
          const terms = await this.prisma.term.findMany({
            where: {
              academicYearId: report.academicYearId,
              type: cycle === 'PREMIER_CYCLE' ? 'MOIS' : 'TRIMESTRE',
            },
            orderBy: { startDate: 'asc' },
          });

          const periodReports = await this.prisma.reportCard.findMany({
            where: {
              studentId: report.studentId,
              academicYearId: report.academicYearId,
              kind: cycle === 'PREMIER_CYCLE' ? 'COMPOSITION' : 'TRIMESTRIEL',
              termId: { in: terms.map((t) => t.id) },
            },
            select: { termId: true, average: true, rank: true },
          });

          const validAverages: number[] = [];
          if (cycle === 'PREMIER_CYCLE') {
            data.compositions = terms.map((t) => {
              const r = periodReports.find((pr) => pr.termId === t.id);
              const avg = r?.average !== null && r?.average !== undefined ? Number(r.average) : null;
              if (avg !== null) validAverages.push(avg);
              return { periodName: t.name, average: avg };
            });
          } else {
            data.terms = terms.map((t) => {
              const r = periodReports.find((pr) => pr.termId === t.id);
              const avg = r?.average !== null && r?.average !== undefined ? Number(r.average) : null;
              if (avg !== null) validAverages.push(avg);
              return { termName: t.name, average: avg, rank: r?.rank ?? null };
            });
          }

          data.annualSum = validAverages.length > 0
            ? Math.round(validAverages.reduce((s, v) => s + v, 0) * 100) / 100
            : null;
          data.annualAverage = validAverages.length > 0 && data.annualSum !== null
            ? Math.round((data.annualSum / validAverages.length) * 100) / 100
            : null;

          const decisionMap: Record<string, string> = {
            ADMIS: 'Admis en classe supérieure',
            PASSE: 'Admis en classe supérieure',
            REDOUBLE: 'Redouble',
            EXCLU: 'Exclu',
            A_DETERMINER: 'À déterminer',
          };
          data.decisionLabel = decisionMap[report.decision ?? 'A_DETERMINER'] ?? 'À déterminer';
        }
        const buffer = kind === 'ANNUEL' || report.kind === 'ANNUEL'
          ? await generateAnnualReportCardPDF(data, this.pdfGenerator)
          : await generateReportCardPDF(data, this.pdfGenerator);
        const safeName = `${report.student.lastName}-${report.student.firstName}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        archive.append(buffer, { name: `bulletin-${safeName}.pdf` });
      } catch (err: any) {
        this.logger.error(`[ClassPdf ${jobId}] Erreur PDF ${report.student.matricule}: ${err.message}`);
      }
      processed++;
      const progress = 5 + Math.round((processed / reports.length) * 90);
      this.jobs.set(jobId, { status: 'processing', progress, createdAt: Date.now() });
    }

    await archive.finalize();
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', reject);
    });

    this.jobs.set(jobId, { status: 'done', progress: 100, count: reports.length, zipPath, createdAt: Date.now() });
  }
}
