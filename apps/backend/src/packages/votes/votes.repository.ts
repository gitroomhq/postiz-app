import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Counter } from '@clickvote/backend/src/packages/votes/counter.document';
import { Votes } from '@clickvote/backend/src/packages/votes/vote.document';
import { VotesList } from 'libs/nest-libraries/src/lib/bigdata/votes/votes.list.document';
import { VotesValidation } from '@clickvote/validations';

@Injectable()
export class VotesRepository {
  constructor(
    @InjectModel(Counter.name) private counterDocument: Model<Counter>,
    @InjectModel(Votes.name) private voteDocument: Model<Votes>,
    @InjectModel(VotesList.name) private votesListModel: Model<VotesList>
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

  async deleteVote(envId: string, id: string, orgId: string) {
    await this.voteDocument.updateOne(
      {
        org: new Types.ObjectId(orgId),
        env: new Types.ObjectId(envId),
        _id: new Types.ObjectId(id)
      },
      {
        deleted: new Date().getTime()
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

 // get all unique votesTo for a vote
  async getVotesUniqueVotesTo(envId: string, voteName: string) {

  return this.votesListModel.distinct('to', {
    env: envId,
    voteId: voteName,
  });
}

async getVoteByName(envId: string, orgId: string, name: string) {
  return this.voteDocument.findOne({
    env: new Types.ObjectId(envId),
    org: new Types.ObjectId(orgId),
    name,
    deleted: { $exists: false }
  });
}

async getVoteAnalytics(envId: string, voteName: string, dateRange?: string, voteTo?: string) {

  console.log('envId', envId)

  const matchQuery: any = { voteId: voteName, env: envId };

  if (voteTo) {
    matchQuery.to = voteTo;
  }

  const dateRangeInMilliseconds = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  };

  const range = dateRangeInMilliseconds[dateRange];

  if (range) {
    matchQuery.time = { $gte: new Date(Date.now() - range) };
  }

  return this.votesListModel.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          $toDate: {
            $subtract: [
              { $toLong: "$time" },
              { $mod: [{ $toLong: "$time" }, 1000 * 60 * 60] },
            ],
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}
}
