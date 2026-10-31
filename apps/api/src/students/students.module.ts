import { Module } from "@nestjs/common";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";
import { VerificationModule } from "../verification/verification.module";
import { PdfModule } from '../common/pdf';

@Module({
  imports: [VerificationModule, PdfModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
