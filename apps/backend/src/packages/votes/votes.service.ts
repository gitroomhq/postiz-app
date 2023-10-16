import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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

  async getVoteByName(envId: string, orgId: string, name: string) {
    return this._votesRepository.getVoteByName(envId, orgId, name);
  }

  async checkVoteName(envId: string, orgId: string, name: string) {
    const vote = await this.getVoteByName(envId, orgId, name);
    if (vote) {
      throw new HttpException('Vote name already exists', HttpStatus.BAD_REQUEST);
    }
    return vote;
  }

  async updateVote(envId: string, voteId: string, orgId: string, body: VotesValidation) {
    return this._votesRepository.updateVote(envId, voteId, orgId, body);
  }

  async deleteVote(envId: string, voteId: string, orgId: string) {
    await this._votesRepository.deleteVote(envId, voteId, orgId);
  }

  async createVote(envId: string, orgId: string, body: VotesValidation) {
    await this.checkVoteName(envId, orgId, body.name);
    return this._votesRepository.createVote(envId, orgId, body);
  }

  async addCounter(voteId: string, voteToId: string, userId: string) {
    return this._votesRepository.addCounter(voteId, voteToId, userId);
  }

  // Add this method to the VotesService
  async getVoteAnalytics(envId, voteName: string, dateRange?: string, voteTo?: string) {
    return this._votesRepository.getVoteAnalytics(envId, voteName, dateRange, voteTo);
  }

  async getVotesUniqueVotesTo(envId: string, voteName: string) {
    return this._votesRepository.getVotesUniqueVotesTo(envId, voteName);
  }
}
