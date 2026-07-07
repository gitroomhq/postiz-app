import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import dayjs from 'dayjs';
import { IdempotencyRepository } from '@gitroom/nestjs-libraries/database/prisma/idempotency/idempotency.repository';

export interface IdempotencyRunParams<T> {
  organizationId: string;
  userId?: string;
  endpoint: string;
  key: string;
  body: any;
  handler: () => Promise<T>;
}

@Injectable()
export class IdempotencyService {
  constructor(private _idempotencyRepository: IdempotencyRepository) {}

  async run<T>(params: IdempotencyRunParams<T>): Promise<T> {
    const requestHash = createHash('sha256')
      .update(JSON.stringify(params.body ?? {}))
      .digest('hex');

    this._idempotencyRepository.deleteExpired().catch(() => {});

    try {
      await this._idempotencyRepository.createProcessing({
        organizationId: params.organizationId,
        userId: params.userId,
        endpoint: params.endpoint,
        key: params.key,
        requestHash,
        expiresAt: dayjs().add(24, 'hours').toDate(),
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return this.resolveExisting<T>(params, requestHash);
      }
      throw err;
    }

    try {
      const response = await params.handler();
      await this._idempotencyRepository.markCompleted(
        params.organizationId,
        params.endpoint,
        params.key,
        response
      );
      return response;
    } catch (err) {
      // Remove the key so a retry after a genuine failure can be processed.
      await this._idempotencyRepository
        .deleteKey(params.organizationId, params.endpoint, params.key)
        .catch(() => {});
      throw err;
    }
  }

  private async resolveExisting<T>(
    params: IdempotencyRunParams<T>,
    requestHash: string
  ): Promise<T> {
    const existing = await this._idempotencyRepository.find(
      params.organizationId,
      params.endpoint,
      params.key
    );

    if (!existing) {
      throw new ConflictException(
        'A request with this idempotency key is already processing'
      );
    }

    if (dayjs(existing.expiresAt).isBefore(dayjs())) {
      await this._idempotencyRepository.deleteKey(
        params.organizationId,
        params.endpoint,
        params.key
      );
      return this.run(params);
    }

    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency key was reused with a different request'
      );
    }

    if (existing.status === 'COMPLETED') {
      return (existing.response ? JSON.parse(existing.response) : undefined) as T;
    }

    throw new ConflictException(
      'A request with this idempotency key is already processing'
    );
  }
}
