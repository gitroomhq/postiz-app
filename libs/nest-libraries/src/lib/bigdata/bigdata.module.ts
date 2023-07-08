import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { defineConfig } from '@mikro-orm/postgresql';
import { VotesModule } from './votes/votes.module';
import { VotesEntity } from './votes/votes.entity';
@Module({
  imports: [
    VotesModule,
    MikroOrmModule.forRoot({
      autoLoadEntities: true,
      ...defineConfig({
        entities: [],
        host: process?.env?.BIGDATA_DB_HOST || '',
        password: process?.env?.BIGDATA_DB_PASSWORD || '',
        port: +(process?.env?.BIGDATA_DB_PORT || 0),
        dbName: process?.env?.BIGDATA_DB_NAME || '',
      }),
    }),
  ],
  get exports() {
    return [...this.imports];
  },
})
export class BigdataModule {}
