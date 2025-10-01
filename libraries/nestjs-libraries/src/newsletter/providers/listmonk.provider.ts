import { NewsletterInterface } from '@gitroom/nestjs-libraries/newsletter/newsletter.interface';

export class ListmonkProvider implements NewsletterInterface {
  name = 'listmonk';
  async register(email: string) {
    const body = {
      email,
      status: 'enabled',
      lists: [+process.env.LISTMONK_LIST_ID].filter((f) => f),
    };

    const authString = `${process.env.LISTMONK_USER}:${process.env.LISTMONK_API_KEY}`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    headers.set(
      'Authorization',
      'Basic ' + Buffer.from(authString).toString('base64')
    );

    try {
      const {
        data: { id },
      } = await (
        await fetch(`${process.env.LISTMONK_DOMAIN}/api/subscribers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
      ).json();

      const welcomeEmail = {
        subscriber_id: id,
        template_id: +process.env.LISTMONK_WELCOME_TEMPLATE_ID,
        subject: 'Welcome to Postiz 🚀',
      };

      await fetch(`${process.env.LISTMONK_DOMAIN}/api/tx`, {
        method: 'POST',
        headers,
        body: JSON.stringify(welcomeEmail),
      });
    } catch (err) {}
  }
}
