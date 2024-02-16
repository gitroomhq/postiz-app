import {Body, Controller, Post} from '@nestjs/common';
import {PostsService} from "@gitroom/nestjs-libraries/database/prisma/posts/posts.service";
import {GetOrgFromRequest} from "@gitroom/nestjs-libraries/user/org.from.request";
import {Organization} from "@prisma/client";
import {CreatePostDto} from "@gitroom/nestjs-libraries/dtos/posts/create.post.dto";

@Controller('/posts')
export class PostsController {
    constructor(
        private _postsService: PostsService
    ) {
    }

    @Post('/')
    createPost(
        @GetOrgFromRequest() org: Organization,
        @Body() body: CreatePostDto
    ) {
        return this._postsService.createPost(org.id, body);
    }
}
