import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    // @ts-ignore - typage des events Prisma
    this.$on('query', (e: any) => {
      const duration = e.duration;
      if (duration >= 50) {
        this.logger.warn(`[SLOW QUERY ${duration}ms] ${e.query}`);
      } else {
        this.logger.debug(`[QUERY ${duration}ms] ${e.query}`);
      }
    });

    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }

  async runInTransaction<T>(fn: (tx: PrismaService) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => fn(tx as PrismaService));
  }
}