import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Counter } from '@clickvote/backend/src/packages/votes/counter.document';
import { Votes } from '@clickvote/backend/src/packages/votes/vote.document';
import { VotesValidation } from '@clickvote/validations';

@Injectable()
export class VotesRepository {
  constructor(
    @InjectModel(Counter.name) private counterDocument: Model<Counter>,
    @InjectModel(Votes.name) private voteDocument: Model<Votes>
  ) {}

  getVoteByIdAndOrg(org: string, id: string) {
    return this.voteDocument.findOne({
      org: new Types.ObjectId(org),
      _id: new Types.ObjectId(id),
    });
  }
  getVote(id: string) {
    return this.voteDocument.findById(id).exec();
  }

  async updateVote(
    envId: string,
    id: string,
    orgId: string,
    body: VotesValidation
  ) {
    return this.voteDocument.updateOne(
      {
        org: new Types.ObjectId(orgId),
        env: new Types.ObjectId(envId),
        _id: new Types.ObjectId(id),
      },
      {
        name: body.name,
        type: body.type,
        start: body.start,
        end: body.end,
      }
    );
  }

  async createVote(envId: string, orgId: string, body: VotesValidation) {
    return this.voteDocument.create({
      org: new Types.ObjectId(orgId),
      env: new Types.ObjectId(envId),
      name: body.name,
      type: body.type,
      start: body.start,
      end: body.end,
    });
  }
  getAllVotesForUser(envId: string, orgId: string, page: number) {
    return this.voteDocument
      .find({
        env: new Types.ObjectId(envId),
        org: new Types.ObjectId(orgId),
        deleted: { $exists: false },
      })
      .skip((page - 1) * 10)
      .limit(10)
      .exec();
  }

  addCounter(voteId: string, voteToId: string, userId: string) {
    return this.counterDocument.create({
      vote: new Types.ObjectId(voteId),
      identifier: voteToId,
      country: 'Israel',
      ip: '127.0.0.1',
      identity: userId,
    });
  }
}
