import { HttpException, Injectable } from '@nestjs/common';
import { StarsRepository } from '@gitroom/nestjs-libraries/database/prisma/stars/stars.repository';
import { chunk, groupBy } from 'lodash';
import dayjs from 'dayjs';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { StarsListDto } from '@gitroom/nestjs-libraries/dtos/analytics/stars.list.dto';
import { mean } from 'simple-statistics';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
enum Inform {
  Removed,
  New,
  Changed,
}
@Injectable()
export class StarsService {
  constructor(
    private _starsRepository: StarsRepository,
    private _notificationsService: NotificationService,
    private _workerServiceProducer: BullMqClient
  ) {}

  getGitHubRepositoriesByOrgId(org: string) {
    return this._starsRepository.getGitHubRepositoriesByOrgId(org);
  }

  getAllGitHubRepositories() {
    return this._starsRepository.getAllGitHubRepositories();
  }

  getStarsByLogin(login: string) {
    return this._starsRepository.getStarsByLogin(login);
  }

  getLastStarsByLogin(login: string) {
    return this._starsRepository.getLastStarsByLogin(login);
  }

  createStars(
    login: string,
    totalNewsStars: number,
    totalStars: number,
    totalNewForks: number,
    totalForks: number,
    date: Date
  ) {
    return this._starsRepository.createStars(
      login,
      totalNewsStars,
      totalStars,
      totalNewForks,
      totalForks,
      date
    );
  }

  async sync(login: string, token?: string) {
    const loadAllStars = await this.syncProcess(login, token);
    const loadAllForks = await this.syncForksProcess(login, token);

    const allDates = [
      ...new Set([...Object.keys(loadAllStars), ...Object.keys(loadAllForks)]),
    ];

    const sortedArray = allDates.sort(
      (a, b) => dayjs(a).unix() - dayjs(b).unix()
    );

    let addPreviousStars = 0;
    let addPreviousForks = 0;
    for (const date of sortedArray) {
      const dateObject = dayjs(date).toDate();
      addPreviousStars += loadAllStars[date] || 0;
      addPreviousForks += loadAllForks[date] || 0;

      await this._starsRepository.createStars(
        login,
        loadAllStars[date] || 0,
        addPreviousStars,
        loadAllForks[date] || 0,
        addPreviousForks,
        dateObject
      );
    }
  }

  async findValidToken(login: string) {
    return this._starsRepository.findValidToken(login);
  }

  async fetchWillFallback(url: string, userToken?: string): Promise<Response> {
    if (userToken) {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3.star+json',
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.status === 200) {
        return response;
      }
    }

    const response2 = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3.star+json',
        ...(process.env.GITHUB_AUTH
          ? { Authorization: `token ${process.env.GITHUB_AUTH}` }
          : {}),
      },
    });

    const totalRemaining = +(
      response2.headers.get('x-ratelimit-remaining') ||
      response2.headers.get('X-RateLimit-Remaining') ||
      0
    );
    const resetTime = +(
      response2.headers.get('x-ratelimit-reset') ||
      response2.headers.get('X-RateLimit-Reset') ||
      0
    );

    if (totalRemaining < 10) {
      console.log('waiting for the rate limit');
      const delay = resetTime * 1000 - Date.now() + 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.fetchWillFallback(url, userToken);
    }

    return response2;
  }

  async syncForksProcess(login: string, userToken?: string, page = 1) {
    console.log('processing forks');
    const starsRequest = await this.fetchWillFallback(
      `https://api.github.com/repos/${login}/forks?page=${page}&per_page=100`,
      userToken
    );

    const data: Array<{ created_at: string }> = await starsRequest.json();
    const mapDataToDate = groupBy(data, (p) =>
      dayjs(p.created_at).format('YYYY-MM-DD')
    );

    // take all the forks from the page
    const aggForks: { [key: string]: number } = Object.values(
      mapDataToDate
    ).reduce(
      (acc, value) => ({
        ...acc,
        [dayjs(value[0].created_at).format('YYYY-MM-DD')]: value.length,
      }),
      {}
    );

    // if we have 100 stars, we need to fetch the next page and merge the results (recursively)
    const nextOne: { [key: string]: number } =
      data.length === 100
        ? await this.syncForksProcess(login, userToken, page + 1)
        : {};

    // merge the results
    const allKeys = [
      ...new Set([...Object.keys(aggForks), ...Object.keys(nextOne)]),
    ];

    return {
      ...allKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: (aggForks[key] || 0) + (nextOne[key] || 0),
        }),
        {} as { [key: string]: number }
      ),
    };
  }

  async syncProcess(login: string, userToken?: string, page = 1) {
    console.log('processing stars');
    const starsRequest = await this.fetchWillFallback(
      `https://api.github.com/repos/${login}/stargazers?page=${page}&per_page=100`,
      userToken
    );

    const data: Array<{ starred_at: string }> = await starsRequest.json();
    const mapDataToDate = groupBy(data, (p) =>
      dayjs(p.starred_at).format('YYYY-MM-DD')
    );

    // take all the stars from the page
    const aggStars: { [key: string]: number } = Object.values(
      mapDataToDate
    ).reduce(
      (acc, value) => ({
        ...acc,
        [dayjs(value[0].starred_at).format('YYYY-MM-DD')]: value.length,
      }),
      {}
    );

    // if we have 100 stars, we need to fetch the next page and merge the results (recursively)
    const nextOne: { [key: string]: number } =
      data.length === 100
        ? await this.syncProcess(login, userToken, page + 1)
        : {};

    // merge the results
    const allKeys = [
      ...new Set([...Object.keys(aggStars), ...Object.keys(nextOne)]),
    ];

    return {
      ...allKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: (aggStars[key] || 0) + (nextOne[key] || 0),
        }),
        {} as { [key: string]: number }
      ),
    };
  }

  async updateTrending(
    language: string,
    hash: string,
    arr: Array<{ name: string; position: number }>
  ) {
    const currentTrending = await this._starsRepository.getTrendingByLanguage(
      language
    );

    if (currentTrending?.hash === hash) {
      return;
    }

    if (currentTrending) {
      const list: Array<{ name: string; position: number }> = JSON.parse(
        currentTrending.trendingList
      );
      const removedFromTrending = list.filter(
        (p) => !arr.find((a) => a.name === p.name)
      );
      const changedPosition = arr.filter((p) => {
        const current = list.find((a) => a.name === p.name);
        return current && current.position !== p.position;
      });
      if (removedFromTrending.length) {
        // let people know they are not trending anymore
        await this.inform(Inform.Removed, removedFromTrending, language);
      }
      if (changedPosition.length) {
        // let people know they changed position
        await this.inform(Inform.Changed, changedPosition, language);
      }
    }

    const informNewPeople = arr.filter(
      (p) =>
        !currentTrending?.trendingList ||
        currentTrending?.trendingList?.indexOf(p.name) === -1
    );

    // let people know they are trending
    await this.inform(Inform.New, informNewPeople, language);
    await this.replaceOrAddTrending(language, hash, arr);
  }

  async inform(
    type: Inform,
    removedFromTrending: Array<{ name: string; position: number }>,
    language: string
  ) {
    const names = await this._starsRepository.getGitHubsByNames(
      removedFromTrending.map((p) => p.name)
    );
    const mapDbNamesToList = names.map(
      (n) => removedFromTrending.find((p) => p.name === n.login)!
    );
    for (const person of mapDbNamesToList) {
      const getOrganizationsByGitHubLogin =
        await this._starsRepository.getOrganizationsByGitHubLogin(person.name);
      for (const org of getOrganizationsByGitHubLogin) {
        switch (type) {
          case Inform.Removed:
            return this._notificationsService.inAppNotification(
              org.organizationId,
              `${person.name} is not trending on GitHub anymore`,
              `${person.name} is not trending anymore in ${language}`,
              true
            );
          case Inform.New:
            return this._notificationsService.inAppNotification(
              org.organizationId,
              `${person.name} is trending on GitHub`,
              `${person.name} is trending in ${
                language || 'On the main feed'
              } position #${person.position}`,
              true
            );
          case Inform.Changed:
            return this._notificationsService.inAppNotification(
              org.organizationId,
              `${person.name} changed trending position on GitHub`,
              `${person.name} changed position in ${
                language || 'on the main feed to position'
              } position #${person.position}`,
              true
            );
        }
      }
    }
  }

  async replaceOrAddTrending(
    language: string,
    hash: string,
    arr: Array<{ name: string; position: number }>
  ) {
    return this._starsRepository.replaceOrAddTrending(language, hash, arr);
  }

  async getStars(org: string) {
    const getGitHubs = await this.getGitHubRepositoriesByOrgId(org);
    const list = [];
    for (const gitHub of getGitHubs) {
      if (!gitHub.login) {
        continue;
      }
      const getAllByLogin = await this.getStarsByLogin(gitHub.login!);

      const stars = getAllByLogin.filter((f) => f.stars);
      const graphSize = stars.length < 10 ? stars.length : stars.length / 10;

      const forks = getAllByLogin.filter((f) => f.forks);
      const graphForkSize =
        forks.length < 10 ? forks.length : forks.length / 10;

      list.push({
        login: gitHub.login,
        stars: chunk(stars, graphSize).reduce((acc, chunkedStars) => {
          return [
            ...acc,
            {
              totalStars: chunkedStars[chunkedStars.length - 1].totalStars,
              date: chunkedStars[chunkedStars.length - 1].date,
            },
          ];
        }, [] as Array<{ totalStars: number; date: Date }>),
        forks: chunk(forks, graphForkSize).reduce((acc, chunkedForks) => {
          return [
            ...acc,
            {
              totalForks: chunkedForks[chunkedForks.length - 1].totalForks,
              date: chunkedForks[chunkedForks.length - 1].date,
            },
          ];
        }, [] as Array<{ totalForks: number; date: Date }>),
      });
    }

    return list;
  }

  async getStarsFilter(orgId: string, starsFilter: StarsListDto) {
    const getGitHubs = await this.getGitHubRepositoriesByOrgId(orgId);
    if (getGitHubs.filter((f) => f.login).length === 0) {
      return [];
    }
    return this._starsRepository.getStarsFilter(
      getGitHubs.map((p) => p.login) as string[],
      starsFilter
    );
  }

  async addGitHub(orgId: string, code: string) {
    const { access_token } = await (
      await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.FRONTEND_URL}/settings`,
        }),
      })
    ).json();

    return this._starsRepository.addGitHub(orgId, access_token);
  }

  async getOrganizations(orgId: string, id: string) {
    const getGitHub = await this._starsRepository.getGitHubById(orgId, id);
    return (
      await fetch(`https://api.github.com/user/orgs`, {
        headers: {
          Authorization: `token ${getGitHub?.token!}`,
        },
      })
    ).json();
  }

  async getRepositoriesOfOrganization(
    orgId: string,
    id: string,
    github: string
  ) {
    const getGitHub = await this._starsRepository.getGitHubById(orgId, id);
    return (
      await fetch(`https://api.github.com/orgs/${github}/repos`, {
        headers: {
          Authorization: `token ${getGitHub?.token!}`,
        },
      })
    ).json();
  }

  async updateGitHubLogin(orgId: string, id: string, login: string) {
    const check = await fetch(`https://github.com/${login}`);
    if (check.status === 404) {
      throw new HttpException('GitHub repository not found!', 404);
    }

    this._workerServiceProducer
      .emit('sync_all_stars', { payload: { login } })
      .subscribe();
    return this._starsRepository.updateGitHubLogin(orgId, id, login);
  }

  async deleteRepository(orgId: string, id: string) {
    return this._starsRepository.deleteRepository(orgId, id);
  }

  async predictTrending(max = 500) {
    const firstDate = dayjs().subtract(1, 'day');
    return [
      firstDate.format('YYYY-MM-DDT12:00:00'),
      ...[...new Array(max)].map((p, index) => {
        return firstDate.add(index, 'day').format('YYYY-MM-DDT12:00:00');
      }),
    ];
  }

  async predictTrendingLoop(
    trendings: Array<{ date: Date }>,
    current = 0,
    max = 500
  ): Promise<Date[]> {
    const dates = trendings.map((result) => dayjs(result.date).toDate());
    const intervals = dates
      .slice(1)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      .map((date, i) => (date - dates[i]) / (1000 * 60 * 60 * 24));
    const nextInterval = intervals.length === 0 ? null : mean(intervals);
    const lastTrendingDate = dates[dates.length - 1];
    const nextTrendingDate = !nextInterval
      ? false
      : dayjs(
          new Date(
            lastTrendingDate.getTime() + nextInterval * 24 * 60 * 60 * 1000
          )
        ).toDate();

    if (!nextTrendingDate) {
      return [];
    }

    return [
      nextTrendingDate,
      ...(current < max
        ? await this.predictTrendingLoop(
            [...trendings, { date: nextTrendingDate }],
            current + 1,
            max
          )
        : []),
    ];
  }
}
