import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { pStore } from '@gitroom/nestjs-libraries/chat/mastra.store';
import { Injectable, Logger } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';

@Injectable()
export class MastraService {
  static mastra: Mastra;
  constructor(private _loadToolsService: LoadToolsService) {}
  async mastra() {
    if (!MastraService.mastra) {
      // @mastra/pg migrates its tables on first use, when a few instances boot together
      // the ADD COLUMN can race, the retry runs against the already migrated schema
      await pStore
        .init()
        .catch(() => pStore.init())
        .catch((err) => Logger.warn(`Mastra storage init failed: ${err}`));
    }

    MastraService.mastra =
      MastraService.mastra ||
      new Mastra({
        storage: pStore,
        agents: {
          postiz: await this._loadToolsService.agent(),
        },
        logger: new ConsoleLogger({
          level: 'info',
        }),
      });

    return MastraService.mastra;
  }
}
