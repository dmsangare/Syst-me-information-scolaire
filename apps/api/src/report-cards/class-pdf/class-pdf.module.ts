import { Module } from '@nestjs/common';
import { ClassPdfController } from './class-pdf.controller';
import { ClassPdfService } from './class-pdf.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PdfModule } from '../../common/pdf';

@Module({
  imports: [PrismaModule, PdfModule],
  controllers: [ClassPdfController],
  providers: [ClassPdfService],
  exports: [ClassPdfService],
})
export class ClassPdfModule {}
