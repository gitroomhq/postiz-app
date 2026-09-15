import { HttpException, Injectable } from '@nestjs/common';
import { AutopostRepository } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostDto } from '@gitroom/nestjs-libraries/dtos/autopost/autopost.dto';
import dayjs from 'dayjs';
import { END, START, StateGraph } from '@langchain/langgraph';
import { AutoPost, Integration, Organization } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { BaseMessage } from '@langchain/core/messages';
import striptags from 'striptags';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import Parser from 'rss-parser';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import {
  organizationId,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
const parser = new Parser();

interface WorkflowChannelsState {
  messages: BaseMessage[];
  integrations: Integration[];
  body: AutoPost;
  description: string;
  image: string;
  id: string;
  load: {
    date: string;
    url: string;
    description: string;
  };
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'gpt-4.1',
  temperature: 0.7,
});

// DallEAPIWrapper always sends dall-e-3 shaped params (response_format, style,
// quality). Pointing it at a gpt-image-* model made every generation 400.
const dalle = new DallEAPIWrapper({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'dall-e-3',
});

const generateContent = z.object({
  socialMediaPostContent: z
    .string()
    .describe('Content for social media posts max 120 chars'),
});

const dallePrompt = z.object({
  generatedTextToBeSentToDallE: z
    .string()
    .describe('Generated prompt from description to be sent to DallE'),
});

@Injectable()
export class AutopostService {
  constructor(
    private _autopostsRepository: AutopostRepository,
    private _temporalService: TemporalService,
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _notificationService: NotificationService
  ) {}

  async stopAll(org: string) {
    const getAll = (await this.getAutoposts(org)).filter((f) => f.active);
    for (const autopost of getAll) {
      // Straight to setActive: this only ever switches rules off, and off is
      // exactly the direction that must never require a subscription.
      await this.setActive(org, autopost.id, false);
    }
  }

  getAutoposts(orgId: string) {
    return this._autopostsRepository.getAutoposts(orgId);
  }

  async createAutopost(orgId: string, body: AutopostDto, id?: string) {
    const data = await this._autopostsRepository.createAutopost(
      orgId,
      body,
      id
    );

    await this.processCron(body.active, orgId, data.id);

    return data;
  }

  async changeActive(org: Organization, id: string, active: boolean) {
    // Switching a rule *off* must never need a subscription — that is the whole
    // reason the route carries no policy decorator. Switching one *on* is a
    // different act: it starts an hourly Temporal workflow. The route was left
    // open on the reasoning that only a paid tier could have created the rule
    // and a lapsed org "cannot reach Settings", but the endpoint is reachable
    // with nothing more than a session, so a lapsed org could keep an hourly
    // workflow running on a free account. Guarded here rather than by decorator
    // because the decorator cannot see which direction is being asked for.
    if (active) {
      // Self-host without Stripe: every feature via the top sellable tier,
      // whatever Subscription row is left. Same test as the rest of billing.
      const tier = !isBillingEnabled()
        ? 'AGENCY'
        : // @ts-ignore
          org?.subscription?.subscriptionTier || 'FREE';

      if (!pricing[tier].autoPost) {
        throw new HttpException(
          'The organization plan does not include autopost',
          400
        );
      }
    }

    return this.setActive(org.id, id, active);
  }

  private async setActive(orgId: string, id: string, active: boolean) {
    const data = await this._autopostsRepository.changeActive(
      orgId,
      id,
      active
    );
    await this.processCron(active, orgId, id);
    return data;
  }

  async processCron(active: boolean, orgId: string, id: string) {
    if (active) {
      try {
        // await, not a bare return: without it the rejection escapes the catch
        // below and surfaces as a 500 at the caller, after the row was already
        // written. TERMINATE_EXISTING because an active rule always has a
        // running `autopost-${id}` — re-saving one used to fail every time with
        // WorkflowExecutionAlreadyStarted. Every other workflow.start in this
        // repo sets a conflict policy.
        return await this._temporalService.client
          .getRawClient()
          ?.workflow.start('autoPostWorkflowV2', {
            workflowId: `autopost-${id}`,
            taskQueue: 'main',
            workflowIdConflictPolicy: 'TERMINATE_EXISTING',
            args: [{ id, immediately: true }],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationId,
                value: orgId,
              },
            ]),
          });
      } catch (err) {
        // Starting failed; do NOT fall through to the terminate branch below —
        // that would take down the workflow this call was trying to bring up.
        // The row is already written as active, so the rule looks on while
        // nothing polls it; leave a trace rather than failing the request or
        // switching the rule off behind the user's back on a Temporal blip.
        console.error(`[autopost] could not start workflow for ${id}`, err);
        return false;
      }
    }

    try {
      return await this._temporalService.terminateWorkflow(`autopost-${id}`);
    } catch (err) {
      return false;
    }
  }

  // PUT goes through here so an id that does not resolve 404s instead of
  // upserting a new rule past the quota policy POST carries.
  async updateAutopost(orgId: string, body: AutopostDto, id: string) {
    await this._autopostsRepository.assertAutopostExists(orgId, id);
    return this.createAutopost(orgId, body, id);
  }

  async deleteAutopost(orgId: string, id: string) {
    const data = await this._autopostsRepository.deleteAutopost(orgId, id);
    await this.processCron(false, orgId, id);
    return data;
  }

  async loadXML(url: string) {
    try {
      const { items } = await parser.parseURL(url);
      const findLast = items.reduce(
        (all: any, current: any) => {
          if (dayjs(current.pubDate).isAfter(all.pubDate)) {
            return current;
          }
          return all;
        },
        { pubDate: dayjs().subtract(100, 'years') }
      );

      // The reduce seed carries no `link`, so an empty feed — or a newest item
      // with no <link> — used to answer success with `url: undefined`. That
      // slipped past the `load.url === lastUrl` gate, published a post whose
      // body was the literal "undefined", and then never advanced lastUrl
      // (Prisma reads undefined as "leave this column alone"), so it republished
      // the same garbage every hour.
      if (!findLast?.link) {
        return { success: false };
      }

      return {
        success: true,
        date: findLast.pubDate,
        url: findLast.link,
        description: striptags(
          findLast?.['content:encoded'] ||
            findLast?.content ||
            findLast?.description ||
            ''
        )
          .replace(/\n/g, ' ')
          .trim(),
      };
    } catch (err) {
      /** sent **/
    }

    return { success: false };
  }

  static state = () =>
    new StateGraph<WorkflowChannelsState>({
      channels: {
        messages: {
          reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
          default: () => [],
        },
        body: null,
        description: null,
        load: null,
        image: null,
        integrations: null,
        id: null,
      },
    });

  async loadUrl(url: string) {
    try {
      const loadDom = new JSDOM(await (await fetch(url)).text());
      loadDom.window.document
        .querySelectorAll('script')
        .forEach((s) => s.remove());
      loadDom.window.document
        .querySelectorAll('style')
        .forEach((s) => s.remove());
      // remove all html, script and styles
      return striptags(loadDom.window.document.body.innerHTML);
    } catch (err) {
      return '';
    }
  }

  async generateDescription(state: WorkflowChannelsState) {
    if (!state.body.generateContent) {
      // `content` is nullable in the schema and @IsOptional in the DTO, so an
      // API-created rule can hold null — schedulePost then does .replace() on it.
      return { ...state, description: state.body.content || '' };
    }

    const description =
      state.load.description || (await this.loadUrl(state.load.url));
    if (!description) {
      return {
        ...state,
        description: '',
      };
    }

    try {
      const structuredOutput = model.withStructuredOutput(generateContent);
      const { socialMediaPostContent } = await ChatPromptTemplate.fromTemplate(
        `
        You are an assistant that gets raw 'description' of a content and generate a social media post content.
        Rules:
        - Maximum 100 chars
        - Try to make it a short as possible to fit any social media
        - Add line breaks between sentences (\\n)
        - Don't add hashtags
        - Add emojis when needed

        'description':
        {content}
      `
      )
        .pipe(structuredOutput)
        .invoke({
          content: description,
        });

      return {
        ...state,
        description: socialMediaPostContent,
      };
    } catch (err) {
      // No API key, rate limit, model error — fall back to the feed's own text
      // rather than throwing. A throw here skips update-url, so lastUrl never
      // advances and the same item is retried every hour forever.
      return { ...state, description };
    }
  }

  async generatePicture(state: WorkflowChannelsState) {
    try {
      const structuredOutput = model.withStructuredOutput(dallePrompt);
      const { generatedTextToBeSentToDallE } =
        await ChatPromptTemplate.fromTemplate(
          `
        You are an assistant that gets description and generate a prompt that will be sent to DallE to generate pictures.

        content:
        {content}
      `
        )
          .pipe(structuredOutput)
          .invoke({
            content: state.load.description || state.description,
          });

      const image = await dalle.invoke(generatedTextToBeSentToDallE);

      return { ...state, image };
    } catch (err) {
      // A picture is a nice-to-have; losing it must not cost the post. Throwing
      // here skips update-url, so lastUrl never advances and the same item is
      // retried every hour forever.
      return { ...state, image: undefined };
    }
  }

  async schedulePost(state: WorkflowChannelsState) {
    const orgId = state.integrations[0].organizationId;

    const content =
      (state.description || '').replace(/\n/g, '\n\n') + '\n\n' + state.load.url;
    const image = !state.image
      ? []
      : [
          {
            id: makeId(10),
            name: makeId(10),
            path: state.image,
            organizationId: orgId,
          },
        ];

    const posts = state.integrations.map((i) => ({
      settings: {
        __type: i.providerIdentifier as any,
        title: '',
        tags: [],
        subreddit: [],
      },
      group: makeId(10),
      integration: { id: i.id },
      value: [{ id: makeId(10), delay: 0, content, image }],
    }));

    // The composer never reaches createPost without validatePosts first
    // (posts.controller.ts refuses anything non-draft that fails), but this
    // path calls createPost directly. The settings above are the draft stub —
    // reddit wants a subreddit, youtube a title and privacy, pinterest a board.
    // Publishing that unattended fails at the provider, so only channels that
    // actually validate get queued; the rest still become drafts the user can
    // finish by hand.
    // Validated one channel at a time. validatePosts is a Promise.all that
    // throws on the first integration it cannot load, so a single bad channel
    // used to take every healthy one down to draft with it. Per-channel, a
    // failure costs only that channel.
    //
    // Draft mode never publishes, so nothing here applies to it — and some
    // providers do media I/O inside checkValidity, so running it for a result
    // that is thrown away costs a request per channel every hour.
    const verdicts = !state.body.autoPublish
      ? []
      : (
          await Promise.all(
            posts.map(async (p) => {
              try {
                return await this._postsService.validatePosts(orgId, [
                  p,
                ] as any);
              } catch (err) {
                return [];
              }
            })
          )
        ).flat();
    const publishable = new Set(
      verdicts
        .filter(
          (v) => v.valid && v.errors === true && !v.tooLong && !v.emptyContent
        )
        .map((v) => v.id)
    );

    const toPublish = state.body.autoPublish
      ? posts.filter((p) => publishable.has(p.integration.id))
      : [];
    const toDraft = posts.filter((p) => !toPublish.includes(p));

    // The slot is resolved per group: sharing one findFreeDateTime between the
    // scheduled and the draft group writes both to the same timestamp, which
    // is the one thing the call exists to avoid.
    const send = async (type: 'schedule' | 'draft', list: typeof posts) =>
      this._postsService.createPost(
        orgId,
        {
          date: (await this._postsService.findFreeDateTime(orgId)) + 'Z',
          order: makeId(10),
          shortLink: false,
          type,
          tags: [],
          posts: list,
        } as any,
        'AUTOPOST'
      );

    if (toPublish.length) {
      await send('schedule', toPublish);
    }
    if (toDraft.length) {
      await send('draft', toDraft);
    }

    if (state.body.autoPublish && toDraft.length) {
      // Built from the channels that actually dropped, not from `verdicts`: a
      // channel whose validation threw contributes no verdict at all, so a run
      // where that was the only reason left the list empty and the notification
      // was suppressed for the one case it exists to report.
      const draftIds = new Set(toDraft.map((p) => p.integration.id));
      const names = state.integrations
        .filter((i) => draftIds.has(i.id))
        .map((i) => {
          const verdict = verdicts.find((v) => v.id === i.id);
          if (!verdict) {
            return `${i.name} (could not be checked)`;
          }
          // `errors` is `true` when validity passed — interpolating it reads
          // as "Name (true)". Only a string is a reason.
          const why =
            verdict.settingsError ||
            (typeof verdict.errors === 'string' ? verdict.errors : '') ||
            (verdict.tooLong ? 'content too long' : '') ||
            (verdict.emptyContent ? 'no content' : '') ||
            'invalid';
          return `${verdict.name || i.name} (${why})`;
        })
        .join(', ');
      await this._notificationService.inAppNotification(
        orgId,
        'Autopost saved drafts instead of publishing',
        `These channels could not publish automatically: ${names}`,
        false,
        false,
        'fail',
        '/launches'
      );
    }
  }

  async updateUrl(state: WorkflowChannelsState) {
    await this._autopostsRepository.updateUrl(state.id, state.load.url);
  }

  async startAutopost(id: string) {
    const getPost = await this._autopostsRepository.getAutopost(id);
    if (!getPost || !getPost.active) {
      return;
    }

    const load = await this.loadXML(getPost.url);
    if (!load.success || load.url === getPost.lastUrl) {
      return;
    }

    // Only in auto-publish mode. getIntegrationsList filters just deletedAt, so
    // without this a broken or downgraded channel gets a post every hour that
    // can never publish — the recovery sweepers in posts.repository skip
    // exactly these.
    //
    // Draft mode is the opposite case: a draft on a channel that needs
    // reconnecting is precisely what the user wants waiting for them once they
    // reconnect. Filtering there — with lastUrl advancing below — would drop
    // every feed item published during a token outage, permanently.
    const allIntegrations =
      await this._integrationService.getIntegrationsList(
        getPost.organizationId
      );
    const integrations = getPost.autoPublish
      ? allIntegrations.filter(
          (f) => !f.disabled && !f.refreshNeeded && !f.inBetweenSteps
        )
      : allIntegrations;

    const parseIntegrations = JSON.parse(getPost.integrations || '[]') || [];
    const neededIntegrations = integrations.filter((i) =>
      parseIntegrations.some((ii: any) => ii.id === i.id)
    );

    const integrationsToSend =
      parseIntegrations.length === 0 ? integrations : neededIntegrations;
    if (integrationsToSend.length === 0) {
      // Silently returning here is how a rule whose channels were all deleted
      // or disabled became a permanent no-op with the toggle still showing on.
      // Claim the item before notifying: without it lastUrl never advances, the
      // same item looks new on the next poll, and the warning repeats every
      // hour forever — createNotification does not dedupe.
      await this._autopostsRepository.updateUrl(id, load.url);
      await this._notificationService.inAppNotification(
        getPost.organizationId,
        'Autopost has no channel to post to',
        `"${getPost.title}" found a new item but none of its channels are usable. Reconnect or pick different channels.`,
        false,
        false,
        'fail',
        '/channels'
      );
      return;
    }

    // update-url runs BEFORE schedule-post on purpose. createPost commits and
    // starts publishing per integration inside a loop, so a throw partway
    // through leaves the earlier channels already published. With lastUrl
    // written last, the activity's 3 Temporal retries re-entered here, passed
    // the `load.url === lastUrl` gate again, and republished those channels —
    // the same post going out up to three times, every hour, because nothing
    // on this path carries an idempotency key (group and value ids are random
    // per call). Claiming the item first turns a retry into a no-op.
    //
    // Trade: if schedule-post throws, that feed item is skipped rather than
    // retried. For a publisher, skipping one item beats publishing it three
    // times, and the failure is reported below.
    const state = AutopostService.state();
    const workflow = state
      .addNode('generate-description', this.generateDescription.bind(this))
      .addNode('generate-picture', this.generatePicture.bind(this))
      .addNode('schedule-post', this.schedulePost.bind(this))
      .addNode('update-url', this.updateUrl.bind(this))
      .addEdge(START, 'generate-description')
      .addConditionalEdges(
        'generate-description',
        (state: WorkflowChannelsState) => {
          if (!state.description) {
            return 'update-url';
          }
          if (state.body.addPicture) {
            return 'generate-picture';
          }
          return 'update-url';
        }
      )
      .addEdge('generate-picture', 'update-url')
      .addEdge('update-url', 'schedule-post')
      .addEdge('schedule-post', END);

    const app = workflow.compile();
    try {
      await app.invoke({
        messages: [],
        id,
        body: getPost,
        load,
        integrations: integrationsToSend,
      });
    } catch (err) {
      // lastUrl is already claimed, so this item will not be retried. Say so
      // rather than letting it vanish — the workflow's own catch is silent.
      await this._notificationService.inAppNotification(
        getPost.organizationId,
        'Autopost could not schedule an item',
        `"${getPost.title}" found a new item but could not schedule it: ${
          (err as Error)?.message || 'unknown error'
        }. The next item will be picked up normally.`,
        false,
        false,
        'fail',
        '/launches'
      );
      throw err;
    }
  }
}
