import {
  AuthTokenDetails,
  MediaContent,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { WhatsAppDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/whatsapp.dto';
import { Integration } from '@prisma/client';
import dayjs from 'dayjs';
import striptags from 'striptags';
import { createHash } from 'crypto';

type WhatsAppConnectionInput = {
  accessToken: string;
  phoneNumberId: string;
  whatsappBusinessAccountId: string;
};

type WhatsAppPhone = {
  display_phone_number?: string;
  verified_name?: string;
};

type WhatsAppBusinessPhoneList = {
  data?: Array<{ id?: string }>;
};

/**
 * Official WhatsApp Cloud API channel. It deliberately contains only channel
 * protocol concerns: connecting a Business phone number and sending a user-
 * directed message. Campaign rules, customer lookups and marketing audiences
 * do not belong in this provider.
 */
export class WhatsAppProvider extends SocialAbstract implements SocialProvider {
  identifier = 'whatsapp';
  name = 'WhatsApp Business';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  dto = WhatsAppDto;
  toolTip = 'Send approved templates or customer-initiated WhatsApp messages';

  private get graphVersion() {
    return process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0';
  }

  maxLength() {
    return 4096;
  }

  override handleErrors(body: string, status: number) {
    // Meta returns the useful reason in an `error` object. SocialAbstract uses
    // this value when constructing its safe, bounded provider error, so parse
    // it here rather than showing Postiz's generic “Unknown Error”.
    try {
      const error = JSON.parse(body)?.error;
      const message = error?.error_user_msg || error?.message;
      if (message) {
        const code = [error?.code, error?.error_subcode]
          .filter((value) => value !== undefined && value !== null)
          .join('/');
        return {
          type: status === 401 ? ('refresh-token' as const) : ('bad-body' as const),
          value: `Meta WhatsApp${code ? ` error ${code}` : ' error'}: ${message}`,
        };
      }
    } catch {
      // Fall through to the base provider error handling for non-JSON errors.
    }
    return undefined;
  }

  async customFields() {
    return [
      {
        key: 'phoneNumberId',
        label: 'WhatsApp Phone Number ID',
        validation: `/^\\d{5,30}$/`,
        type: 'text' as const,
        hint: 'Postiz Local Meta app -> WhatsApp -> API Setup. This is the Phone number ID, not the visible phone number.',
      },
      {
        key: 'whatsappBusinessAccountId',
        label: 'WhatsApp Business Account ID (WABA ID)',
        validation: `/^\\d{5,30}$/`,
        type: 'text' as const,
        hint: 'Postiz Local Meta app -> WhatsApp -> API Setup. It must be the WABA that owns the Phone Number ID above.',
      },
      {
        key: 'accessToken',
        label: 'System user access token',
        validation: `/^.{20,}$/`,
        type: 'password' as const,
        hint: 'Use a token authorized for this WhatsApp Business Account. It is stored server-side and never returned by Postiz.',
      },
    ];
  }

  async refreshToken(): Promise<AuthTokenDetails> {
    // Cloud API system-user tokens are managed in Meta Business Manager. A
    // refresh flow must not pretend it can refresh a token that Meta did not
    // issue as refreshable OAuth credentials.
    return {
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(17);
    return { url: state, codeVerifier: makeId(10), state };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }): Promise<AuthTokenDetails | string> {
    let connection: WhatsAppConnectionInput;
    try {
      connection = JSON.parse(Buffer.from(params.code, 'base64').toString());
    } catch {
      return 'Invalid WhatsApp connection details';
    }

    if (
      !/^\d{5,30}$/.test(connection.phoneNumberId || '') ||
      !/^\d{5,30}$/.test(connection.whatsappBusinessAccountId || '') ||
      !connection.accessToken
    ) {
      return 'A valid WhatsApp Phone Number ID, WhatsApp Business Account ID, and system-user access token are required';
    }

    try {
      const phone = (await (
        await this.fetch(
          `https://graph.facebook.com/${this.graphVersion}/${connection.phoneNumberId}?fields=display_phone_number,verified_name`,
          { headers: { Authorization: `Bearer ${connection.accessToken}` } },
          'validate WhatsApp connection'
        )
      ).json()) as WhatsAppPhone;

      const wabaPhones = (await (
        await this.fetch(
          `https://graph.facebook.com/${this.graphVersion}/${connection.whatsappBusinessAccountId}/phone_numbers?fields=id&limit=250`,
          { headers: { Authorization: `Bearer ${connection.accessToken}` } },
          'verify WhatsApp Business Account'
        )
      ).json()) as WhatsAppBusinessPhoneList;

      if (
        !wabaPhones.data?.some(
          (phoneNumber) => phoneNumber.id === connection.phoneNumberId
        )
      ) {
        return 'The Phone Number ID belongs to a different WhatsApp Business Account. Use credentials from the same Postiz Local WABA.';
      }

      const name = phone.verified_name || phone.display_phone_number || 'WhatsApp Business';
      return {
        id: connection.phoneNumberId,
        name,
        accessToken: connection.accessToken,
        refreshToken: '',
        expiresIn: dayjs().add(10, 'years').unix() - dayjs().unix(),
        picture: '',
        username: phone.display_phone_number || connection.phoneNumberId,
        additionalSettings: [
          {
            title: 'WhatsApp Business Account ID',
            description: 'The WABA used by this Postiz Local WhatsApp channel.',
            type: 'text',
            value: connection.whatsappBusinessAccountId,
            regex: '^\\d{5,30}$',
          },
        ],
      };
    } catch (err) {
      return err instanceof Error && err.message
        ? `WhatsApp could not verify this Postiz Local connection: ${err.message}`
        : 'WhatsApp could not verify this Business phone number or token';
    }
  }

  private cleanRecipients(...values: Array<string | undefined>) {
    return [...new Set(
      values
        .flatMap((value) => String(value || '').split(/[\s,;|]+/))
        .map((value) => value.replace(/[^0-9]/g, ''))
        .filter((value) => /^[1-9]\d{6,14}$/.test(value))
    )];
  }

  private cleanText(value: string) {
    // Postiz's normal editor stores paragraphs as HTML. WhatsApp accepts
    // plain text, so preserve visual paragraph boundaries before stripping
    // tags instead of sending (or previewing) literal <p> markup.
    return striptags(
      String(value || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    )
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private mediaPayload(media: MediaContent, caption?: string) {
    const type = media.type === 'video' ? 'video' : 'image';
    return {
      messaging_product: 'whatsapp',
      to: '',
      type,
      [type]: { link: this.publicMediaUrl(media.path), ...(caption ? { caption } : {}) },
    };
  }

  private publicMediaUrl(path: string) {
    const url = /^https?:\/\//i.test(path || '')
      ? path
      : `${String(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/${String(path || '').replace(/^\//, '')}`;
    if (!/^https:\/\//i.test(url)) {
      throw new Error(
        'WhatsApp images need a publicly reachable HTTPS URL. Set FRONTEND_URL to your HTTPS tunnel or media host before creating or sending an image template.'
      );
    }
    return url;
  }

  private async send(
    phoneNumberId: string,
    accessToken: string,
    payload: Record<string, unknown>
  ) {
    return (
      await this.fetch(
        `https://graph.facebook.com/${this.graphVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        'send WhatsApp message'
      )
    ).json() as Promise<{ messages?: Array<{ id: string }> }>;
  }

  private async uploadTemplateImage(
    accessToken: string,
    mediaUrl: string
  ) {
    const imageUrl = this.publicMediaUrl(mediaUrl);
    // Meta's /media endpoint does not reliably ingest a JSON `link` for a
    // template example.  It expects a real multipart file upload.  Download
    // the Postiz asset here so that the template request is independent of
    // Meta being able to crawl a temporary/local URL.
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Postiz could not read the selected image for the WhatsApp template (HTTP ${imageResponse.status}). Upload the image again and retry.`
      );
    }
    const imageBytes = await imageResponse.arrayBuffer();
    if (!imageBytes.byteLength) {
      throw new Error('The selected image is empty. Upload a valid JPG or PNG and retry.');
    }
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      throw new Error('The selected media is not an image. WhatsApp image templates require a JPG or PNG.');
    }
    // A WhatsApp /media ID is valid for sending a message, but Meta template
    // creation explicitly requires the `h` returned by Graph's resumable
    // upload API.  Do not substitute the two: Meta reports 131009/2494102.
    const appId = String(
      process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID || ''
    ).trim();
    if (!/^\d{5,30}$/.test(appId)) {
      throw new Error(
        'Image templates need the Postiz Local Meta App ID. Set FACEBOOK_APP_ID (or WHATSAPP_APP_ID) in the Docker environment and restart Postiz.'
      );
    }
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const filename = `postiz-template-sample.${extension}`;
    const session = await this.fetch(
      `https://graph.facebook.com/${this.graphVersion}/${appId}/uploads?file_name=${encodeURIComponent(filename)}&file_length=${imageBytes.byteLength}&file_type=${encodeURIComponent(contentType)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${accessToken}`,
        },
      },
      'create WhatsApp template image upload session'
    );
    const sessionData = (await session.json()) as { id?: string };
    if (!sessionData.id) {
      throw new Error('Meta did not return an upload session for the image template sample');
    }
    const uploaded = await this.fetch(
      `https://graph.facebook.com/${this.graphVersion}/${sessionData.id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${accessToken}`,
          'Content-Type': contentType,
          file_offset: '0',
        },
        body: imageBytes,
      },
      'upload WhatsApp template image bytes'
    );
    const uploadData = (await uploaded.json()) as { h?: string };
    if (!uploadData.h) {
      throw new Error('Meta did not return a template image handle after uploading the sample');
    }
    return uploadData.h;
  }

  private savedWabaId(integration?: Integration) {
    try {
      const setting = JSON.parse(integration?.additionalSettings || '[]').find(
        (item: { title?: string; value?: unknown }) =>
          item?.title === 'WhatsApp Business Account ID'
      );
      const wabaId = String(setting?.value || '');
      return /^\d{5,30}$/.test(wabaId) ? wabaId : undefined;
    } catch {
      return undefined;
    }
  }

  private async getWabaId(
    phoneNumberId: string,
    accessToken: string,
    integration?: Integration
  ) {
    const configuredWabaId = this.savedWabaId(integration);
    if (configuredWabaId) return configuredWabaId;

    // A WABA is not available as a field on a Phone Number node. Older
    // Postiz WhatsApp connections predate the required WABA credential, so
    // give them an actionable migration message instead of issuing an invalid
    // Graph request and surfacing Meta error 100.
    throw new Error(
      'This WhatsApp channel was connected without a WhatsApp Business Account ID. Choose Add Channel -> WhatsApp Business and reconnect the same Phone Number ID with its WABA ID and Postiz Local system-user token.'
    );
  }

  async whatsappTemplates(
    accessToken: string,
    _data: unknown,
    phoneNumberId: string,
    integration?: Integration
  ) {
    const wabaId = await this.getWabaId(phoneNumberId, accessToken, integration);
    const response = (await (
      await this.fetch(
        `https://graph.facebook.com/${this.graphVersion}/${wabaId}/message_templates?fields=id,name,language,status,category,components&limit=250`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        'load WhatsApp templates'
      )
    ).json()) as { data?: unknown[] };
    return { templates: response.data || [] };
  }

  async createWhatsAppTemplate(
    accessToken: string,
    data: { body?: string; language?: string; category?: string; mediaUrl?: string },
    phoneNumberId: string,
    integration?: Integration
  ) {
    const body = this.cleanText(data.body || '');
    if (!body) throw new Error('Write a message before creating a template');
    const wabaId = await this.getWabaId(phoneNumberId, accessToken, integration);
    const imageSampleId = data.mediaUrl
      ? await this.uploadTemplateImage(accessToken, data.mediaUrl)
      : undefined;
    const name = `postiz_marketing_${createHash('sha256')
      .update(`${data.language || 'en_US'}:${body}:${data.mediaUrl ? 'image' : 'text'}`)
      .digest('hex')
      .slice(0, 18)}`;
    const response = await this.fetch(
      `https://graph.facebook.com/${this.graphVersion}/${wabaId}/message_templates`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          language: data.language || 'en_US',
          category: data.category || 'MARKETING',
          components: [
            ...(imageSampleId
              ? [
                  {
                    type: 'HEADER',
                    format: 'IMAGE',
                    example: {
                      header_handle: [imageSampleId],
                    },
                  },
                ]
              : []),
            { type: 'BODY', text: body.slice(0, 1024) },
          ],
        }),
      },
      'create WhatsApp template'
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error?.message || 'Meta rejected the template request');
    }
    return { name, language: data.language || 'en_US', status: 'PENDING', ...result };
  }

  private async waitForTemplateApproval(
    accessToken: string,
    phoneNumberId: string,
    integration: Integration,
    name: string,
    language: string,
    waitForApproval: boolean
  ) {
    const wabaId = await this.getWabaId(phoneNumberId, accessToken, integration);
    const maxWaitSeconds = Math.max(
      60,
      Number(process.env.WHATSAPP_TEMPLATE_APPROVAL_WAIT_SECONDS || 1800)
    );
    const deadline = Date.now() + maxWaitSeconds * 1000;

    while (true) {
      const response = await this.fetch(
        `https://graph.facebook.com/${this.graphVersion}/${wabaId}/message_templates?fields=name,language,status&limit=250`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        'check WhatsApp template approval status'
      );
      const result = (await response.json()) as {
        data?: Array<{ name?: string; language?: string; status?: string }>;
      };
      const status = result.data?.find(
        (template) => template.name === name && template.language === language
      )?.status;

      if (status === 'APPROVED') return;
      if (status && !['PENDING', 'IN_APPEAL'].includes(status)) {
        throw new Error(
          `Meta did not approve template "${name}" (status: ${status}). Update the copy or media sample and create a new template.`
        );
      }
      if (!waitForApproval) {
        throw new Error(
          `Template "${name}" is ${status || 'not available'} in Meta. Refresh templates after approval, or enable automatic approval waiting when creating it.`
        );
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Template "${name}" is still ${status || 'pending'} after ${maxWaitSeconds / 60} minutes. The post was not sent; retry after Meta approves it.`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<WhatsAppDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [post] = postDetails;
    if (post.settings.postType && post.settings.postType !== 'MESSAGE') {
      throw new Error(
        'WhatsApp Channel, Status, and Ad publishing are not available through the Business Cloud API. Use Message, or publish that content manually.'
      );
    }
    const recipients = this.cleanRecipients(
      post.settings.to,
      post.settings.recipients
    );
    if (!recipients.length) {
      throw new Error('At least one recipient phone number is required for WhatsApp');
    }
    if (recipients.length > 100) {
      throw new Error('A WhatsApp CSV send is limited to 100 recipients per post');
    }
    if (recipients.length > 1 && !post.settings.templateName) {
      throw new Error(
        'CSV sends require an approved WhatsApp template and recipient opt-in. Add a template name before scheduling.'
      );
    }
    if (post.settings.templateName && !post.settings.marketingOptIn) {
      throw new Error(
        'Confirm that every recipient explicitly opted in to WhatsApp marketing before sending an approved template.'
      );
    }
    if (!post.settings.templateName && !post.settings.customerServiceWindow) {
      throw new Error(
        'Direct WhatsApp text, image, or video messages require an active customer-service window. Ask the customer to message your business first, then confirm it here.'
      );
    }

    const text = this.cleanText(post.message);
    let result: { messages?: Array<{ id: string }> } | undefined;

    if (post.settings.templateName) {
      await this.waitForTemplateApproval(
        accessToken,
        id,
        integration,
        post.settings.templateName,
        post.settings.templateLanguage || 'en_US',
        !!post.settings.waitForTemplateApproval
      );
      const templateComponents = post.settings.templateHasImage
        ? (() => {
            if (!post.media?.[0]) {
              throw new Error(
                'The selected WhatsApp template has an image header. Attach an image before sending it.'
              );
            }
            return [
              {
                type: 'header',
                parameters: [
                  {
                    type: 'image',
                    image: { link: this.publicMediaUrl(post.media[0].path) },
                  },
                ],
              },
            ];
          })()
        : undefined;
      result = await this.send(id, accessToken, {
        messaging_product: 'whatsapp',
        to: recipients[0],
        type: 'template',
        template: {
          name: post.settings.templateName,
          language: { code: post.settings.templateLanguage || 'en_US' },
          ...(templateComponents ? { components: templateComponents } : {}),
        },
      });
    } else if (post.media?.length) {
      const first = this.mediaPayload(post.media[0], text || undefined);
      first.to = recipients[0];
      result = await this.send(id, accessToken, first);
      // A single Cloud API message has one primary media item. Send additional
      // files as individual messages rather than silently dropping them.
      for (const media of post.media.slice(1)) {
        const next = this.mediaPayload(media);
        next.to = recipients[0];
        await this.send(id, accessToken, next);
      }
    } else {
      result = await this.send(id, accessToken, {
        messaging_product: 'whatsapp',
        to: recipients[0],
        type: 'text',
        text: { body: text },
      });
    }

    // The Cloud API is one-recipient-per-request. Send remaining approved
    // template recipients after the first message succeeds.
    for (const recipient of recipients.slice(1)) {
      await this.send(id, accessToken, {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: post.settings.templateName!,
          language: { code: post.settings.templateLanguage || 'en_US' },
          ...(post.settings.templateHasImage && post.media?.[0]
            ? {
                components: [
                  {
                    type: 'header',
                    parameters: [
                      {
                        type: 'image',
                        image: { link: this.publicMediaUrl(post.media[0].path) },
                      },
                    ],
                  },
                ],
              }
            : {}),
        },
      });
    }

    const messageId = result?.messages?.[0]?.id;
    if (!messageId) {
      throw new Error('WhatsApp did not return a message ID');
    }

    return [
      {
        id: post.id,
        postId: messageId,
        releaseURL: '',
        status: 'success',
      },
    ];
  }
}
