import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CashSessionsController } from './cash-sessions.controller';
import { CashSessionsService } from './cash-sessions.service';
import { PdfModule } from '../common/pdf';

@Module({
  imports: [PrismaModule, PdfModule],
  controllers: [CashSessionsController],
  providers: [CashSessionsService],
  exports: [CashSessionsService],
})
export class CashSessionsModule {}
