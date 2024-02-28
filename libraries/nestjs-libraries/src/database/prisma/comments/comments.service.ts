import { Injectable } from '@nestjs/common';
import { CommentsRepository } from '@gitroom/nestjs-libraries/database/prisma/comments/comments.repository';

@Injectable()
export class CommentsService {
  constructor(private _commentsRepository: CommentsRepository) {}

  addAComment(orgId: string, userId: string, comment: string, date: string) {
    return this._commentsRepository.addAComment(orgId, userId, comment, date);
  }

  addACommentToComment(
    orgId: string,
    userId: string,
    commentId: string,
    comment: string,
    date: string
  ) {
    return this._commentsRepository.addACommentToComment(orgId, userId, commentId, comment, date);
  }

  updateAComment(
    orgId: string,
    userId: string,
    commentId: string,
    comment: string
  ) {
    return this._commentsRepository.updateAComment(
      orgId,
      userId,
      commentId,
      comment
    );
  }

  deleteAComment(orgId: string, userId: string, commentId: string) {
    return this._commentsRepository.deleteAComment(orgId, userId, commentId);
  }

  loadAllCommentsAndSubCommentsForADate(orgId: string, date: string) {
    return this._commentsRepository.loadAllCommentsAndSubCommentsForADate(
      orgId,
      date
    );
  }

  getAllCommentsByWeekYear(orgId: string, year: number, week: number) {
    return this._commentsRepository.getAllCommentsByWeekYear(orgId, year, week);
  }
}
