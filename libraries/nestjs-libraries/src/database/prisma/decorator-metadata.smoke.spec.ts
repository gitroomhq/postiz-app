import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { PrismaRepository, PrismaService } from './prisma.service';

/**
 * Gate for the test runner's decorator handling.
 *
 * Every NestJS class in this repo injects purely by constructor parameter type
 * with no @Inject() token, so DI depends entirely on the `design:paramtypes`
 * metadata that `emitDecoratorMetadata` produces. If the Oxc transformer
 * configured in vitest.config.ts stops emitting it, every Nest test fails with
 * "Nest can't resolve dependencies of X (?)" - which reads like a DI bug rather
 * than a build-config one. This spec makes that failure obvious and immediate.
 */
describe('decorator metadata', () => {
  it('emits design:paramtypes for constructor injection', () => {
    expect(Reflect.getMetadata('design:paramtypes', PrismaRepository)).toEqual([
      PrismaService,
    ]);
  });

  it('lets Nest resolve a constructor-typed dependency', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService, PrismaRepository],
    }).compile();

    expect(moduleRef.get(PrismaRepository)).toBeInstanceOf(PrismaRepository);
  });
});
