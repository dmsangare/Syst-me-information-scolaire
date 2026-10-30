import { Module } from "@nestjs/common";
import { AnnualDecisionsController } from "./annual-decisions.controller";
import { AnnualDecisionsService } from "./annual-decisions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportCardsModule } from "../report-cards/report-cards.module"; // ✅ Ajout

@Module({
  imports: [PrismaModule, ReportCardsModule], // ✅ Ajout
  controllers: [AnnualDecisionsController],
  providers: [AnnualDecisionsService],
  exports: [AnnualDecisionsService],
})
export class AnnualDecisionsModule {}