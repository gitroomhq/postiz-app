import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { StarsListDto } from '@gitroom/nestjs-libraries/dtos/analytics/stars.list.dto';

@Injectable()
export class StarsRepository {
  constructor(
    private _github: PrismaRepository<'gitHub'>,
    private _stars: PrismaRepository<'star'>,
    private _trending: PrismaRepository<'trending'>
  ) {}
  getGitHubRepositoriesByOrgId(org: string) {
    return this._github.model.gitHub.findMany({
      where: {
        organizationId: org,
      },
    });
  }
  replaceOrAddTrending(
    language: string,
    hashedNames: string,
    arr: { name: string; position: number }[]
  ) {
    return this._trending.model.trending.upsert({
      create: {
        language,
        hash: hashedNames,
        trendingList: JSON.stringify(arr),
        date: new Date(),
      },
      update: {
        language,
        hash: hashedNames,
        trendingList: JSON.stringify(arr),
        date: new Date(),
      },
      where: {
        language,
      },
    });
  }

  getAllGitHubRepositories() {
    return this._github.model.gitHub.findMany({
      distinct: ['login'],
    });
  }

  async getLastStarsByLogin(login: string) {
    return (
      await this._stars.model.star.findMany({
        where: {
          login,
        },
        orderBy: {
          date: 'desc',
        },
        take: 1,
      })
    )?.[0];
  }

  async getStarsByLogin(login: string) {
    return this._stars.model.star.findMany({
      where: {
        login,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async getGitHubsByNames(names: string[]) {
    return this._github.model.gitHub.findMany({
      where: {
        login: {
          in: names,
        },
      },
    });
  }

  findValidToken(login: string) {
    return this._github.model.gitHub.findFirst({
      where: {
        login,
      },
    });
  }

  createStars(
    login: string,
    totalNewsStars: number,
    totalStars: number,
    totalNewForks: number,
    totalForks: number,
    date: Date
  ) {
    return this._stars.model.star.upsert({
      create: {
        login,
        stars: totalNewsStars,
        forks: totalNewForks,
        totalForks,
        totalStars,
        date,
      },
      update: {
        stars: totalNewsStars,
        totalStars,
        forks: totalNewForks,
        totalForks,
      },
      where: {
        login_date: {
          date,
          login,
        },
      },
    });
  }

  getTrendingByLanguage(language: string) {
    return this._trending.model.trending.findUnique({
      where: {
        language,
      },
    });
  }

  getStarsFilter(githubs: string[], starsFilter: StarsListDto) {
    return this._stars.model.star.findMany({
      orderBy: {
        [starsFilter.key || 'date']: starsFilter.state || 'desc',
      },
      where: {
        login: {
          in: githubs.filter((f) => f),
        },
      },
      take: 20,
      skip: (starsFilter.page - 1) * 10,
    });
  }

  addGitHub(orgId: string, accessToken: string) {
    return this._github.model.gitHub.create({
      data: {
        token: accessToken,
        organizationId: orgId,
        jobId: '',
      },
    });
  }

  getGitHubById(orgId: string, id: string) {
    return this._github.model.gitHub.findUnique({
      where: {
        organizationId: orgId,
        id,
      },
    });
  }

  updateGitHubLogin(orgId: string, id: string, login: string) {
    return this._github.model.gitHub.update({
      where: {
        organizationId: orgId,
        id,
      },
      data: {
        login,
      },
    });
  }

  deleteRepository(orgId: string, id: string) {
    return this._github.model.gitHub.delete({
      where: {
        organizationId: orgId,
        id,
      },
    });
  }

  getOrganizationsByGitHubLogin(login: string) {
    return this._github.model.gitHub.findMany({
      select: {
        organizationId: true,
      },
      where: {
        login,
      },
      distinct: ['organizationId'],
    });
  }
}
