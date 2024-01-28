import { Controller, Get } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  @EventPattern('new_vote')
  handleData(data) {
  }
}
