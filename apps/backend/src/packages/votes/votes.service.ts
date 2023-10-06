import { Injectable } from '@nestjs/common';
import { VotesRepository } from '@clickvote/backend/src/packages/votes/votes.repository';
import { VotesValidation } from '@clickvote/validations';
import {RedisService} from "@clickvote/nest-libraries";

@Injectable()
export class VotesService {
  constructor(
    private readonly _votesRepository: VotesRepository,
    private readonly _redisService: RedisService
  ) {}

  async getVote(orgId: string, voteId: string) {
    return this._votesRepository.getVoteByIdAndOrg(orgId, voteId);
  }
  async getAllVotesForOrg(envId: string, orgId: string, page: number) {
    return this._votesRepository.getAllVotesForUser(envId, orgId, page);
  }

  async updateVote(envId: string, voteId: string, orgId: string, body: VotesValidation) {
    return this._votesRepository.updateVote(envId, voteId, orgId, body);
  }

  async createVote(envId: string, orgId: string, body: VotesValidation) {
    return this._votesRepository.createVote(envId, orgId, body);
  }

  async addCounter(voteId: string, voteToId: string, userId: string) {
    return this._votesRepository.addCounter(voteId, voteToId, userId);
  }

  // Add this method to the VotesService
  async getVoteAnalytics(voteId: string) {
    return this._votesRepository.getVoteAnalytics(voteId);
  }

  async getVotesUniqueVotesTo(voteId: string) {
    return this._votesRepository.getVotesUniqueVotesTo(voteId);
  }
}
