import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Org } from "@clickvote/backend/src/packages/org/org.document";
import { OrgInvite } from '@clickvote/backend/src/packages/org/org.invite.document';
import { OrgInviteStatus } from '@clickvote/interfaces';

@Injectable()
export class OrgRepository {
  constructor(
    @InjectModel(Org.name) private orgModel: Model<Org>,
    @InjectModel(OrgInvite.name) private orgInviteModel: Model<OrgInvite>
  ) {}

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

  async getInvitesByOrgId(id: string) {
    return this.orgInviteModel.find({ _id: new Types.ObjectId(id) });
  }

  async createOrgInvite(org: Org, email: string) {
    return this.orgInviteModel.create({
      org,
      email
    });
  }

  async getPendingOrgInviteByEmail(email: string) {
    return this.orgInviteModel.findOne({
      email,
      status: OrgInviteStatus.PENDING
    }).populate('org');
  }

  async getOrgInviteByIdAndEmail(id: string, email: string) {
    return this.orgInviteModel.findOne<{ org: string; }>({
      _id: new Types.ObjectId(id),
      email,
      status: OrgInviteStatus.PENDING
    });
  }

  async updateOrgInviteStatus(id: string, status: OrgInviteStatus) {
    return this.orgInviteModel.updateOne(
      {
        _id: new Types.ObjectId(id),
      }, 
      {
        status
      }
    );
  }

  async deleteOrgInvite(id: string, email: string) {
    return this.orgInviteModel.deleteOne({
      _id: new Types.ObjectId(id),
      email
    });
  }
}
