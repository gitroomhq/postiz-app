import {Body, Controller, Get, Param, Post, Put, Query} from '@nestjs/common';
import {PostsService} from "@gitroom/nestjs-libraries/database/prisma/posts/posts.service";
import {GetOrgFromRequest} from "@gitroom/nestjs-libraries/user/org.from.request";
import {Organization} from "@prisma/client";
import {CreatePostDto} from "@gitroom/nestjs-libraries/dtos/posts/create.post.dto";
import {GetPostsDto} from "@gitroom/nestjs-libraries/dtos/posts/get.posts.dto";

@Controller('/posts')
export class PostsController {
    constructor(
        private _postsService: PostsService
    ) {
    }

    @Get('/')
    getPosts(
        @GetOrgFromRequest() org: Organization,
        @Query() query: GetPostsDto
    ) {
        return this._postsService.getPosts(org.id, query);
    }

    @Get('/:id')
    getPost(
        @GetOrgFromRequest() org: Organization,
        @Param('id') id: string,
    ) {
        return this._postsService.getPost(org.id, id);
    }

    @Post('/')
    createPost(
        @GetOrgFromRequest() org: Organization,
        @Body() body: CreatePostDto
    ) {
        return this._postsService.createPost(org.id, body);
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
