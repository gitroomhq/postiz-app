import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '@clickvote/backend/src/packages/users/users.document';
import { Model, Types } from 'mongoose';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userDocument: Model<User>) {}

  async getById(id: string) {
    return this.userDocument.findById(id).populate('org').exec();
  }
  getByEmail(email: string) {
    return this.userDocument.findOne({ email }).exec();
  }

  register(email: string, password: string, org: Types.ObjectId) {
    return this.userDocument.create({ email, password, org: [org] });
  }
}
