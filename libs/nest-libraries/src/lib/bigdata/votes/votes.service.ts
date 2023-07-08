import { Injectable } from '@nestjs/common';
import { VotesRepository } from './votes.repository';
import {VotesInterface} from "./votes.interface";

@Injectable()
export class VotesService {
  constructor(private _votesRepository: VotesRepository) {}

  addRow(data: VotesInterface) {
    return this._votesRepository.addRow(data);
  }
}
