import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '@clickvote/backend/src/packages/users/users.document';
import { Org } from '@clickvote/backend/src/packages/org/org.document';
import { Model, Types } from 'mongoose';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userDocument: Model<User>) {}

  async getById(id: string) {
    return this.userDocument.findById(id).populate('org').exec();
  }
  getByEmail(email: string) {
    return this.userDocument.findOne<Omit<User, 'org'> & { id: string; org: string[]; }>({ email }).exec();
  }

  register(email: string, password: string, org: Types.ObjectId) {
    return this.userDocument.create({ email, password, org: [org] });
  }

  async addOrg(id: string, org: Org) {
    const user = await this.userDocument.findById(id);
    user.org.push(org);
    await user.save();
  }
}
