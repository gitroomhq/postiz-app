import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgenciesService } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';

@ApiTags('Public')
@Controller('/public')
export class PublicController {
  constructor(
    private _agenciesService: AgenciesService,
    private _postsService: PostsService
  ) {}
  @Get('/agencies-list')
  async getAgencyByUser() {
    return this._agenciesService.getAllAgencies();
  }

  @Get('/agencies-list-slug')
  async getAgencySlug() {
    return this._agenciesService.getAllAgenciesSlug();
  }

  @Get('/agencies-information/:agency')
  async getAgencyInformation(@Param('agency') agency: string) {
    return this._agenciesService.getAgencyInformation(agency);
  }

  @Get('/agencies-list-count')
  async getAgenciesCount() {
    return this._agenciesService.getCount();
  }

  @Get(`/posts/:id`)
  async getPreview(@Param('id') id: string) {
    return (await this._postsService.getPostsRecursively(id, true)).map(
      ({ childrenPost, ...p }) => ({
        ...p,
        ...(p.integration
          ? {
              integration: {
                id: p.integration.id,
                name: p.integration.name,
                picture: p.integration.picture,
                providerIdentifier: p.integration.providerIdentifier,
                profile: p.integration.profile,
              },
            }
          : {}),
      })
    );
  }
}
