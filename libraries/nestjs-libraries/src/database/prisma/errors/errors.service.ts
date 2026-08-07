import { Injectable } from '@nestjs/common';
import { ErrorsRepository } from '@gitroom/nestjs-libraries/database/prisma/errors/errors.repository';

@Injectable()
export class ErrorsService {
  constructor(private _errorsRepository: ErrorsRepository) {}

  listErrors(params: {
    page?: number;
    limit?: number;
    platform?: string;
    email?: string;
    unknownFirst?: boolean;
  }) {
    return this._errorsRepository.listErrors(params);
  }

  listPlatforms() {
    return this._errorsRepository.listPlatforms();
  }
}
