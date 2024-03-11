import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import { CommentsService } from '@gitroom/nestjs-libraries/database/prisma/comments/comments.service';
import {StarsService} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.service";
import {CheckPolicies} from "@gitroom/backend/services/auth/permissions/permissions.ability";
import {AuthorizationActions, Sections} from "@gitroom/backend/services/auth/permissions/permissions.service";
import {ApiTags} from "@nestjs/swagger";

@ApiTags('Posts')
@Controller('/posts')
export class PostsController {
  constructor(
    private _postsService: PostsService,
    private _commentsService: CommentsService,
    private _starsService: StarsService
  ) {}

  @Get('/')
  async getPosts(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetPostsDto
  ) {
    const [posts, comments] = await Promise.all([
      this._postsService.getPosts(org.id, query),
      this._commentsService.getAllCommentsByWeekYear(
        org.id,
        query.year,
        query.week
      ),
    ]);

    return {
      posts,
      comments,
    };
  }

  @Get('/predict-trending')
  predictTrending() {
    return this._starsService.predictTrending();
  }

  @Get('/old')
  oldPosts(
      @GetOrgFromRequest() org: Organization,
      @Query('date') date: string
  ) {
    return this._postsService.getOldPosts(org.id, date);
  }

  @Get('/:id')
  getPost(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._postsService.getPost(org.id, id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH])
  createPost(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreatePostDto
  ) {
    return this._postsService.createPost(org.id, body);
  }

  @Delete('/:group')
  deletePost(
    @GetOrgFromRequest() org: Organization,
    @Param('group') group: string
  ) {
    return this._postsService.deletePost(org.id, group);
  }

  @Put('/:id/date')
  changeDate(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('date') date: string
  ) {
    return this._postsService.changeDate(org.id, id, date);
  }
}
