import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SignatureDto } from '@gitroom/nestjs-libraries/dtos/signature/signature.dto';

@Injectable()
export class SignatureRepository {
  constructor(private _signatures: PrismaRepository<'signatures'>) {}

  getSignaturesByOrgId(orgId: string) {
    return this._signatures.model.signatures.findMany({
      where: { organizationId: orgId, deletedAt: null },
    });
  }

  getDefaultSignature(orgId: string) {
    return this._signatures.model.signatures.findFirst({
      where: { organizationId: orgId, autoAdd: true, deletedAt: null },
    });
  }

  async createOrUpdateSignature(
    orgId: string,
    signature: SignatureDto,
    id?: string
  ) {
    const values = {
      organizationId: orgId,
      content: signature.content,
      autoAdd: signature.autoAdd,
    };

    const { id: updatedId } = await this._signatures.model.signatures.upsert({
      where: { id: id || uuidv4(), organizationId: orgId },
      update: values,
      create: values,
    });

    if (values.autoAdd) {
      await this._signatures.model.signatures.updateMany({
        where: { organizationId: orgId, id: { not: updatedId } },
        data: { autoAdd: false },
      });
    }

    return { id: updatedId };
  }

  deleteSignature(orgId: string, id: string) {
    return this._signatures.model.signatures.update({
      where: { id, organizationId: orgId },
      data: { deletedAt: new Date() },
    });
  }
}
