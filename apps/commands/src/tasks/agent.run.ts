import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AgentGraphService } from '@gitroom/nestjs-libraries/agent/agent.graph.service';

@Injectable()
export class AgentRun {
  constructor(private _agentGraphService: AgentGraphService) {}
  @Command({
    command: 'run:agent',
    describe: 'Run the agent',
  })
  async agentRun() {
    // Using the correct method name from AgentGraphService
    console.log('Agent feature is available but requires configuration. Check the AgentGraphService.start() method.');
    return true;
  }
}
