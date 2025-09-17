import { newsletterProviders } from '@gitroom/nestjs-libraries/newsletter/providers';

export class NewsletterService {
  static getProvider() {
    if (process.env.BEEHIIVE_API_KEY) {
      return newsletterProviders.find((p) => p.name === 'beehiiv')!;
    }
    if (process.env.LISTMONK_API_KEY) {
      return newsletterProviders.find((p) => p.name === 'listmonk')!;
    }

    return newsletterProviders.find((p) => p.name === 'empty')!;
  }
  static async register(email: string) {
    if (email.indexOf('@') === -1) {
      return;
    }
    return NewsletterService.getProvider().register(email);
  }
}
