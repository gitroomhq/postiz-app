import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose, { Connection, Types } from 'mongoose';

@Injectable()
export class EnvService {
  constructor(@InjectConnection() private connection: Connection) {}

  validateApiKey(key: string) {
    return this.connection.collection('environments').findOne({
      apiKey: key,
    });
  }

  private calculateCount(
    type: 'single' | 'range',
    previousValue: number,
    newValue: number
  ) {
    if (type === 'range') {
      if (+previousValue === +newValue) {
        return 0;
      }
      if (+previousValue === 0 && +newValue > 0) {
        return 1;
      }
      if (+previousValue > 0 && newValue === 0) {
        return -1;
      }
      return 0;
    }
    if (type === 'single') {
      return +newValue > +previousValue
        ? 1
        : +newValue < +previousValue
        ? -1
        : newValue === previousValue
        ? 0
        : 0;
    }
  }

  async persistentNumbers(
    key: string,
    voteId: string,
    voteToId: string,
    userId: string,
    type: 'single' | 'range',
    previousValue: number,
    newValue: number
  ) {
    return this.connection.collection('votes').updateOne(
      {
        env: new Types.ObjectId(key),
        name: voteId,
      },
      {
        $inc: {
          sum: -previousValue + newValue,
          count: this.calculateCount(type, previousValue, newValue),
        },
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
