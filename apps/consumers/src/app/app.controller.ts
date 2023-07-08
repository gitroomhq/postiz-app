import { Controller, Get } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { VotesInterface, VotesService } from '@clickvote/nest-libraries';

@Controller()
export class AppController {
  constructor(private _votesService: VotesService) {}
  @EventPattern('new_vote')
  handleData(data: VotesInterface) {
    return this._votesService.addRow(data);
  }
}
