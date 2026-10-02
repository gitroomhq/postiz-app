import { Global, Module } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { toolList } from '@gitroom/nestjs-libraries/chat/tools/tool.list';
import { McpRelayService } from '@gitroom/nestjs-libraries/chat/mcp.relay.service';

@Global()
@Module({
  providers: [MastraService, LoadToolsService, McpRelayService, ...toolList],
  get exports() {
    return this.providers;
  },
})
export class ChatModule {}
