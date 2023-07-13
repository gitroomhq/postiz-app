import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';

@Injectable()
export class EnvService {
  constructor(@InjectConnection() private connection: Connection) {}

  validateApiKey(key: string) {
    return this.connection.collection('environments').findOne({
      apiKey: key,
    });
  }

  async cachedVotes(
    key: string,
    voteId: string,
    voteToId: string,
    userId: string,
    type: 'single' | 'range',
    newValue: number
  ) {
    return this.connection.collection('cached_votes').updateOne(
      {
        voteId: voteId,
        voteToId,
        userId,
      },
      {
        $set: {
          key,
          voteId: voteId,
          voteToId,
          userId,
          total: newValue,
        },
      },
      {
        upsert: true,
      }
    );
  }

  async getVoteByEnvAndId(keyId: string, voteTo: string) {
    try {
      const data = await this.connection.collection('votes').findOne({
        env: new mongoose.Types.ObjectId(keyId),
        name: voteTo,
      });

      return data;
    } catch (err) {
      return false;
    }
  }
}
