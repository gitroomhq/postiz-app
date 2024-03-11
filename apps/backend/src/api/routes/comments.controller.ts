import {Body, Controller, Delete, Get, Param, Post, Put} from '@nestjs/common';
import { CommentsService } from '@gitroom/nestjs-libraries/database/prisma/comments/comments.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { AddCommentDto } from '@gitroom/nestjs-libraries/dtos/comments/add.comment.dto';
import {ApiTags} from "@nestjs/swagger";

@ApiTags('Comments')
@Controller('/comments')
export class CommentsController {
  constructor(private _commentsService: CommentsService) {}

  @Post('/')
  addComment(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() addCommentDto: AddCommentDto
  ) {
    return this._commentsService.addAComment(
      org.id,
      user.id,
      addCommentDto.content,
      addCommentDto.date
    );
  }

  @Post('/:id')
  addCommentTocComment(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() addCommentDto: AddCommentDto,
    @Param('id') id: string
  ) {
    return this._commentsService.addACommentToComment(
      org.id,
      user.id,
      id,
      addCommentDto.content,
      addCommentDto.date
    );
  }

  @Put('/:id')
  editComment(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() addCommentDto: AddCommentDto,
    @Param('id') id: string
  ) {
    return this._commentsService.updateAComment(
      org.id,
      user.id,
      id,
      addCommentDto.content
    );
  }

  @Delete('/:id')
  deleteComment(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._commentsService.deleteAComment(
      org.id,
      user.id,
      id,
    );
  }

  @Get('/:date')
  loadAllCommentsAndSubCommentsForADate(
    @GetOrgFromRequest() org: Organization,
    @Param('date') date: string
  ) {
    return this._commentsService.loadAllCommentsAndSubCommentsForADate(
      org.id,
      date
    );
  }
}
