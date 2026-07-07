import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class IdempotencyRepository {
  constructor(private _idempotencyKey: PrismaRepository<'idempotencyKey'>) {}

  find(organizationId: string, endpoint: string, key: string) {
    return this._idempotencyKey.model.idempotencyKey.findUnique({
      where: {
        organizationId_key_endpoint: { organizationId, key, endpoint },
      },
    });
  }

  createProcessing(params: {
    organizationId: string;
    userId?: string;
    endpoint: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
  }) {
    return this._idempotencyKey.model.idempotencyKey.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        endpoint: params.endpoint,
        key: params.key,
        requestHash: params.requestHash,
        status: 'PROCESSING',
        expiresAt: params.expiresAt,
      },
    });
  }

  markCompleted(
    organizationId: string,
    endpoint: string,
    key: string,
    response: any
  ) {
    return this._idempotencyKey.model.idempotencyKey.update({
      where: {
        organizationId_key_endpoint: { organizationId, key, endpoint },
      },
      data: {
        status: 'COMPLETED',
        response: JSON.stringify(response ?? null),
      },
    });
  }

  deleteKey(organizationId: string, endpoint: string, key: string) {
    return this._idempotencyKey.model.idempotencyKey.deleteMany({
      where: { organizationId, endpoint, key },
    });
  }

  deleteExpired() {
    return this._idempotencyKey.model.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
