import { Injectable, Module } from '@nestjs/common';
import {
  InjectConnection,
  MongooseModule as ImportedMongoose,
} from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ClientSession } from 'mongodb';

@Injectable()
export class MongooseHelpers {
  constructor(
    @InjectConnection()
    private readonly _connection: Connection
  ) {}

  async transaction(callback: (conn: ClientSession) => Promise<any>) {
    const session = await this._connection.startSession();
    let result;
    await session.withTransaction(async (s) => {
      result = await callback(s);
    });

    await session.endSession();

    return result;
  }
}
@Module({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  imports: [ImportedMongoose.forRoot(process.env.MONGO_URL!)],
  exports: [ImportedMongoose],
})
export class MongooseModule {}
