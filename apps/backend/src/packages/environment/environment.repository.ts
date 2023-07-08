import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Environment } from '@clickvote/backend/src/packages/environment/environment.document';

@Injectable()
export class EnvironmentRepository {
  constructor(
    @InjectModel(Environment.name) private environmentModel: Model<Environment>
  ) {}

  getKeysByOrgAndEnv(orgId: string, envId: string) {
    return this.environmentModel
      .findOne({
        org: new Types.ObjectId(orgId),
        _id: new Types.ObjectId(envId),
      })
      .select('apiKey secretKey');
  }
  getEnvironmentsByOrgId(orgId: number) {
    return this.environmentModel.find({ org: new Types.ObjectId(orgId) }).sort({
      order: 1,
    });
  }
  async createEnvironment(
    orgId: number,
    name: string,
    apiKey: string,
    secretKey: string,
    order: number
  ) {
    return this.environmentModel.create({
      org: new Types.ObjectId(orgId),
      name,
      apiKey,
      secretKey,
      order,
    });
  }
}
