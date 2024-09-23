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
import { Organization, User } from '@prisma/client';
import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import { StarsService } from '@gitroom/nestjs-libraries/database/prisma/stars/stars.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permissions.service';
import { ApiTags } from '@nestjs/swagger';
import { MessagesService } from '@gitroom/nestjs-libraries/database/prisma/marketplace/messages.service';
import { GeneratorDto } from '@gitroom/nestjs-libraries/dtos/generator/generator.dto';
import { CreateGeneratedPostsDto } from '@gitroom/nestjs-libraries/dtos/generator/create.generated.posts.dto';

@ApiTags('Posts')
@Controller('/posts')
export class PostsController {
  constructor(
    private _postsService: PostsService,
    private _starsService: StarsService,
    private _messagesService: MessagesService
  ) {}

  @Get('/marketplace/:id?')
  async getMarketplacePosts(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._messagesService.getMarketplaceAvailableOffers(org.id, id);
  }

  @Get('/')
  async getPosts(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetPostsDto
  ) {
    const [posts] = await Promise.all([
      this._postsService.getPosts(org.id, query),
      // this._commentsService.getAllCommentsByWeekYear(
      //   org.id,
      //   query.year,
      //   query.week
      // ),
    ]);

    return {
      posts,
      // comments,
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
    console.log(JSON.stringify(body, null, 2));
    return this._postsService.createPost(org.id, body);
  }

  @Post('/generator/draft')
  @CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH])
  generatePostsDraft(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateGeneratedPostsDto
  ) {
    return this._postsService.generatePostsDraft(org.id, body);
  }

  @Post('/generator')
  @CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH])
  generatePosts(
    @GetOrgFromRequest() org: Organization,
    @Body() body: GeneratorDto
  ) {
    return this._postsService.generatePosts(org.id, body);
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
