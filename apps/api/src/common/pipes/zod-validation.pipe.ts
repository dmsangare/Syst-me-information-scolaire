import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodType, ZodError } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value) as T;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Erreur de validation',
          details: error.issues.map((e) => ({
            field: e.path.join('.') || 'global',
            message: e.message,
          })),
        });
      }
      throw new BadRequestException('Erreur de validation inconnue');
    }
  }
}