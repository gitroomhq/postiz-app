import { VotesInterface } from './votes.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VotesList } from './votes.list.document';

export class VotesRepository {
  constructor(
    @InjectModel(VotesList.name) private _votesListModel: Model<VotesList>
  ) {}
  addRow(data: VotesInterface) {
    return this._votesListModel.create({
      ...data,
      time: new Date(),
    });
  }
}
