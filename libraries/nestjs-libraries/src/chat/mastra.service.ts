import { type Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { pStore } from '@gitroom/nestjs-libraries/chat/mastra.store';
import { Injectable } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';

@Injectable()
export class MastraService {
  static mastra: Mastra;
  constructor(private _loadToolsService: LoadToolsService) {}
  async mastra() {
    if (MastraService.mastra) {
      return MastraService.mastra;
    }

    const MastraInstance = await import('@mastra/core/mastra').then(
      (m) => m.Mastra
    );
    MastraService.mastra = new MastraInstance({
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
