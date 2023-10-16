import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {Model, Types} from 'mongoose';
import {Org} from "@clickvote/backend/src/packages/org/org.document";

@Injectable()
export class OrgRepository {
  constructor(@InjectModel(Org.name) private orgModel: Model<Org>) {}

  async getById(id: string) {
    return this.orgModel.findById(id);
  }
  createOrg(name: string) {
    const org = new this.orgModel({ name });
    return org.save();
  }

  async updateOrg(id: string, name: string) {
    return this.orgModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { name }
    );
  }
}
