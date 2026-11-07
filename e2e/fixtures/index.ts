import { test as base, expect, type Page } from '@playwright/test';
import type { Integration, Organization, User } from '@prisma/client';
import {
  createIntegration,
  createOrgWithUser,
} from '@gitroom/testing/factories/organization.factory';
import type { RecordedRequest } from '@gitroom/testing/msw/handlers/mastodon.router';

const MOCK = process.env.MOCK_MASTODON_URL ?? 'http://127.0.0.1:4600';

export const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

export type SeededOrg = {
  user: User;
  organization: Organization;
  token: string;
  membershipId: string;
  integration: Integration;
};

export type MockControl = {
  requests(): Promise<RecordedRequest[]>;
  requestsTo(path: string): Promise<RecordedRequest[]>;
  reset(): Promise<void>;
  program(entries: Array<{ path: string; status: number; body?: unknown }>): Promise<void>;
};

export const test = base.extend<{
  org: SeededOrg;
  mock: MockControl;
  signedInPage: Page;
}>({
  /**
   * An organization with one connected Mastodon channel.
   *
   * Seeded straight into Postgres rather than driven through the UI: every
   * spec needs it, and only connect-channel.api.spec.ts is actually about the
   * OAuth flow itself.
   *
   * Deliberately depends on nothing from the browser. Taking `context` here
   * would launch a browser for the api project too, which needs none - and
   * fails outright on a machine with no browsers installed.
   */
  org: async ({}, use) => {
    const seeded = await createOrgWithUser();
    const integration = await createIntegration(seeded.organization.id);

    await use({ ...seeded, integration });
  },

  /**
   * A page already carrying the seeded session. With NOT_SECURED=true the auth
   * cookie is a plain, non-httpOnly cookie on domain "localhost", so it can be
   * injected rather than obtained by driving the login form.
   */
  signedInPage: async ({ page, org }, use) => {
    await page.context().addCookies([
      { name: 'auth', value: org.token, domain: 'localhost', path: '/' },
      { name: 'showorg', value: org.organization.id, domain: 'localhost', path: '/' },
    ]);

    await use(page);
  },

  mock: async ({ request }, use) => {
    await request.post(`${MOCK}/__mock/reset`);

    await use({
      requests: async () => (await request.get(`${MOCK}/__mock/requests`)).json(),
      requestsTo: async (path: string) => {
        const all: RecordedRequest[] = await (
          await request.get(`${MOCK}/__mock/requests`)
        ).json();
        return all.filter((r) => r.path === path);
      },
      reset: async () => {
        await request.post(`${MOCK}/__mock/reset`);
      },
      program: async (entries) => {
        await request.post(`${MOCK}/__mock/program`, { data: entries });
      },
    });
  },
});

export { expect };
