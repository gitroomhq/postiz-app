import { Global, Module } from '@nestjs/common';
import { MainMcp } from '@chaolaolo/backend/mcp/main.mcp';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [MainMcp],
  get exports() {
    return [...this.providers];
  },
})
export class McpModule { }
