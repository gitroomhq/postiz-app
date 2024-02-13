import {Ability, AbilityBuilder, AbilityClass} from "@casl/ability";
import {Injectable} from "@nestjs/common";
import {pricing} from "@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing";
import {SubscriptionService} from "@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service";

export enum Sections {
    FRIENDS = 'friends',
    CROSSPOSTING = 'crossposting',
    AI = 'ai',
    INTEGRATIONS = 'integrations',
    TOTALPOSTS = 'totalPosts',
    MEDIAS = 'medias',
    INFLUENCERS = 'influencers',
}

export enum AuthorizationActions {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export type AppAbility = Ability<[AuthorizationActions, Sections]>;

@Injectable()
export class PermissionsService {
  constructor(
    private _subscriptionService: SubscriptionService,
  ) {
  }
    async getPackageOptions(orgId: string) {
        const subscription = await this._subscriptionService.getSubscriptionByOrganizationId(orgId);
        return pricing[subscription?.subscriptionTier || !process.env.PAYMENT_PUBLIC_KEY ? 'PRO' : 'FREE'];
    }

    async check(orgId: string) {
      const { can, build } = new AbilityBuilder<Ability<[AuthorizationActions, Sections]>>(Ability as AbilityClass<AppAbility>);

      // const options  = await this.getPackageOptions(orgId);

      return build({
        detectSubjectType: (item) =>
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          item.constructor
      });
    }
}
