import { Module } from "@nestjs/common";
import { ClassSubjectsService } from "./class-subjects.service";
import { ClassSubjectsController } from "./class-subjects.controller";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [ClassSubjectsController],
  providers: [ClassSubjectsService, PrismaService],
  exports: [ClassSubjectsService],
})
export class ClassSubjectsModule {}