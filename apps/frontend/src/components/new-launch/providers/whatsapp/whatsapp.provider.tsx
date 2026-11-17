'use client';

import { ChangeEvent, FC, useEffect, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { WhatsAppDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/whatsapp.dto';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Textarea } from '@gitroom/react/form/textarea';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';

const WhatsAppSettings: FC = () => {
  const form = useSettings();
  const fetch = useFetch();
  const { integration, value } = useIntegration();
  const [csvNotice, setCsvNotice] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateNotice, setTemplateNotice] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const selectedTemplateName = form.watch('templateName') || '';

  const templateBody = (template?: any) =>
    String(
      template?.components?.find((component: any) => component?.type === 'BODY')
        ?.text || ''
    ).trim();

  const responseData = async (response: Response) => {
    const raw = await response.text();
    if (!raw.trim()) {
      throw new Error(
        'Postiz received an empty response. Reconnect the WhatsApp channel with a valid Postiz Local system-user token, then try again.'
      );
    }
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(raw.slice(0, 500));
    }
  };

  const loadTemplates = async () => {
    if (!integration?.id) return;
    setLoadingTemplates(true);
    try {
      const response = await fetch('/integrations/function', {
        method: 'POST',
        body: JSON.stringify({ id: integration.id, name: 'whatsappTemplates', data: {} }),
      });
      const data = await responseData(response);
      if (!response.ok || data?.error) throw new Error(data?.error || 'Template request failed');
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setTemplateNotice('');
    } catch (error) {
      setTemplateNotice(error instanceof Error ? error.message : 'Could not load templates. Reconnect with whatsapp_business_management permission.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [integration?.id]);

  // The Meta template is the source of truth once it has been selected. Keep
  // a display-only copy in the form so previews never show draft copy that
  // Meta will replace at send time.
  useEffect(() => {
    if (!selectedTemplateName) {
      form.setValue('templatePreviewBody', undefined, { shouldDirty: false });
      return;
    }
    const selected = templates.find(
      (template) => template.name === selectedTemplateName
    );
    if (selected) {
      form.setValue('templatePreviewBody', templateBody(selected), {
        shouldDirty: false,
      });
    }
  }, [selectedTemplateName, templates]);

  const submitCurrentAsTemplate = async () => {
    if (!integration?.id) return;
    setLoadingTemplates(true);
    try {
      const response = await fetch('/integrations/function', {
        method: 'POST',
        body: JSON.stringify({
          id: integration.id,
          name: 'createWhatsAppTemplate',
          data: {
            body: value?.[0]?.content || '',
            mediaUrl: value?.[0]?.image?.[0]?.path,
            language: form.getValues('templateLanguage') || 'en_US',
            category: 'MARKETING',
          },
        }),
      });
      const data = await responseData(response);
      if (!response.ok || data === false || data?.error) {
        throw new Error(data?.error || 'Template request failed');
      }
      const templateName = String(data.name || '');
      const language = String(data.language || form.getValues('templateLanguage') || 'en_US');
      form.setValue('templateName', templateName, { shouldDirty: true, shouldValidate: true });
      form.setValue('templateLanguage', language, { shouldDirty: true, shouldValidate: true });
      form.setValue('templateHasImage', !!value?.[0]?.image?.length, { shouldDirty: true, shouldValidate: true });
      form.setValue('templatePreviewBody', String(value?.[0]?.content || '').replace(/<[^>]*>/g, '').trim(), { shouldDirty: true });
      form.setValue('waitForTemplateApproval', true, { shouldDirty: true, shouldValidate: true });
      setTemplateNotice(`Template ${templateName} was submitted to Meta. Postiz is queuing this post now and will send it automatically as soon as Meta approves the template.`);
      await loadTemplates();
      // Queue through the normal Postiz submit path. The modal performs the
      // same recipient/consent validation as a manual Post now click, while
      // the server-side provider waits for the Meta approval result.
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('postiz:whatsapp-template-submitted')
        );
      }, 0);
    } catch (error) {
      setTemplateNotice(error instanceof Error ? error.message : 'Template could not be submitted.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const rows = content
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);
    if (!rows.length) {
      setCsvNotice('The CSV is empty.');
      return;
    }

    const separator = rows[0].includes(';') ? ';' : ',';
    const firstRow = rows[0].split(separator).map((cell) => cell.trim().toLowerCase());
    const phoneColumn = firstRow.findIndex((cell) =>
      ['phone', 'phone_number', 'whatsapp', 'whatsapp_number', 'number', 'mobile'].includes(cell)
    );
    const dataRows = phoneColumn >= 0 ? rows.slice(1) : rows;
    const column = phoneColumn >= 0 ? phoneColumn : 0;
    const recipients = [...new Set(
      dataRows
        .map((row) => (row.split(separator)[column] || '').replace(/[^0-9]/g, ''))
        .filter((phone) => /^[1-9]\d{6,14}$/.test(phone))
    )];

    if (!recipients.length) {
      setCsvNotice('No valid phone column found. Use a phone, mobile, number, or whatsapp header.');
      return;
    }
    if (recipients.length > 100) {
      setCsvNotice(`Found ${recipients.length} valid numbers. Split the CSV into batches of 100 or fewer.`);
      return;
    }

    form.setValue('recipients', recipients.join(','), { shouldValidate: true });
    setCsvNotice(`${recipients.length} customer number${recipients.length === 1 ? '' : 's'} imported from CSV.`);
    event.target.value = '';
  };
  return (
    <div
      className="grid grid-cols-1 gap-[10px]"
      data-whatsapp-composer-mode="message"
    >
      <div className="rounded-[8px] border border-green-500/50 bg-green-500/10 p-[12px]">
        <div className="text-[15px] font-semibold">WhatsApp message setup</div>
        <div className="mt-[3px] text-[12px] opacity-80">
          Choose the category, then enter the customer number for a direct
          message.
        </div>
      </div>
      <Select
        label="Publishing category"
        disableForm
        name="postType"
        value={form.watch('postType') || 'MESSAGE'}
        onChange={(event) =>
          form.setValue('postType', event.target.value as 'MESSAGE', {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      >
        <option value="MESSAGE">Message to customer - send with Postiz</option>
        <option value="CHANNEL" disabled>
          Channel post - create with AI, publish manually in WhatsApp
        </option>
        <option value="STATUS" disabled>
          Status post - create with AI, publish manually in WhatsApp
        </option>
        <option value="AD" disabled>
          Click-to-WhatsApp ad - create in Facebook Ads Manager
        </option>
      </Select>
      <div className="rounded-[8px] border border-input p-[12px]">
        <div className="mb-[8px] text-[14px] font-medium">
          WhatsApp content type
        </div>
        <div className="grid grid-cols-1 gap-[8px]">
          <div className="rounded-[6px] border border-green-500/50 bg-green-500/10 p-[10px]">
            <div className="font-medium">Message to customer · API ready</div>
            <div className="mt-[3px] text-[12px] opacity-70">
              Send a text, template, image, or video to one opted-in WhatsApp
              customer.
            </div>
          </div>
          <div className="rounded-[6px] border border-input p-[10px] opacity-70">
            <div className="font-medium">Channel post · manual publish only</div>
            <div className="mt-[3px] text-[12px]">
              Meta&apos;s Business Cloud API has no Channel publishing endpoint.
              You can create copy with AI here, then post it in WhatsApp.
            </div>
          </div>
          <div className="rounded-[6px] border border-input p-[10px] opacity-70">
            <div className="font-medium">Status post · manual publish only</div>
            <div className="mt-[3px] text-[12px]">
              Meta&apos;s Business Cloud API has no Status publishing endpoint.
              Create the content here, then publish it from the WhatsApp app.
            </div>
          </div>
        </div>
      </div>
      <Input
        label="Customer WhatsApp number (required for Message)"
        placeholder="+919876543210"
        {...form.register('to')}
      />
      <div className="rounded-[8px] border border-input p-[12px]">
        <div className="text-[14px] font-medium">Or import customers from CSV</div>
        <div className="mt-[3px] text-[12px] opacity-70">
          CSV stays in your browser. Use a column named phone, mobile, number,
          whatsapp, or whatsapp_number. Up to 100 opted-in customers per send.
        </div>
        <input
          className="mt-[10px] block w-full text-[12px]"
          type="file"
          accept=".csv,text/csv"
          onChange={importCsv}
        />
        <Textarea
          className="mt-[10px]"
          label="Imported customer numbers"
          placeholder="CSV numbers appear here"
          {...form.register('recipients')}
        />
        {!!csvNotice && <div className="mt-[6px] text-[12px] opacity-80">{csvNotice}</div>}
      </div>
      <div className="rounded-[8px] border border-input p-[12px]">
        <Select
          label="Approved Meta template"
          disableForm
          name="templateName"
          value={form.watch('templateName') || ''}
          onChange={(event) => {
            const templateName = event.target.value;
            const selected = templates.find(
              (template) => template.name === templateName
            );
            form.setValue('templateName', templateName || undefined, {
              shouldDirty: true,
              shouldValidate: true,
            });
            if (selected?.language) {
              form.setValue('templateLanguage', selected.language, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }
            form.setValue(
              'templateHasImage',
              !!selected?.components?.some(
                (component: any) =>
                  component?.type === 'HEADER' &&
                  component?.format === 'IMAGE'
              ),
              { shouldDirty: true, shouldValidate: true }
            );
            form.setValue('templatePreviewBody', templateBody(selected), {
              shouldDirty: true,
            });
            form.setValue('waitForTemplateApproval', false, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        >
          <option value="">No template - only for an active customer-service conversation</option>
          {templates
            .filter((template) => template.status === 'APPROVED')
            .map((template) => (
              <option key={`${template.name}-${template.language}`} value={template.name}>
                {template.name} ({template.language})
              </option>
            ))}
        </Select>
        <div className="mt-[8px] flex gap-[8px]">
          <button type="button" className="rounded-[6px] bg-[#612BD3] px-[10px] py-[7px] text-[12px] text-white" onClick={loadTemplates} disabled={loadingTemplates}>
            {loadingTemplates ? 'Loading...' : 'Refresh templates'}
          </button>
          <button type="button" className="rounded-[6px] border border-input px-[10px] py-[7px] text-[12px]" onClick={submitCurrentAsTemplate} disabled={loadingTemplates}>
            Create {value?.[0]?.image?.length ? 'image ' : ''}marketing template from this post
          </button>
        </div>
        {!!templateNotice && <div className="mt-[7px] text-[12px] opacity-80">{templateNotice}</div>}
        {!!selectedTemplateName && !!form.watch('templatePreviewBody') && (
          <div className="mt-[8px] rounded-[6px] bg-muted p-[8px] text-[12px] opacity-85">
            Meta will send this approved template body exactly. To change the
            message text, create a new template from the current post and wait
            for Meta approval.
          </div>
        )}
        {!!form.watch('waitForTemplateApproval') && (
          <div className="mt-[8px] rounded-[6px] bg-green-500/10 p-[8px] text-[12px] text-green-700 dark:text-green-300">
            Waiting for Meta approval is enabled. Postiz will poll the template status and send this scheduled post automatically once it is approved.
          </div>
        )}
      </div>
      <Input label="Template language" placeholder="en_US" {...form.register('templateLanguage')} />
      {!form.watch('templateName') ? (
        <div className="rounded-[8px] border border-amber-500/50 bg-amber-500/10 p-[12px]">
          <div className="mb-[6px] text-[13px] font-medium">Customer-service session</div>
          <Checkbox
            label="The customer messaged this business within the last 24 hours."
            {...form.register('customerServiceWindow')}
          />
          <div className="mt-[6px] text-[12px] opacity-75">
            Required for a direct text, image, or video. This is the best option for the Diwali image after the customer replies “Hi”.
          </div>
        </div>
      ) : (
        <div className="rounded-[8px] border border-amber-500/50 bg-amber-500/10 p-[12px]">
          <div className="mb-[6px] text-[13px] font-medium">Marketing consent</div>
          <Checkbox
            label="Every selected customer has explicitly opted in to receive WhatsApp marketing."
            {...form.register('marketingOptIn')}
          />
          <div className="mt-[6px] text-[12px] opacity-75">
            Required for approved marketing templates and CSV campaigns. Meta can accept a request but suppress delivery without customer consent.
          </div>
        </div>
      )}
      <p className="text-[12px] opacity-70">
        This composer is deliberately separate from Facebook and Instagram:
        it creates a direct business message. Enter a recipient; spaces and
        dashes are accepted. CSV sends require an approved template and the
        customer&apos;s explicit WhatsApp opt-in. Use an approved template outside
        Meta&apos;s customer-service window.
      </p>
    </div>
  );
};

const WhatsAppPreview: FC = () => {
  const { value, integration } = useIntegration();
  const form = useSettings();
  const mediaDirectory = useMediaDirectory();
  const templateMessage = String(form.watch('templatePreviewBody') || '').trim();
  const message = String(templateMessage || value?.[0]?.content || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const name = integration?.name || 'WhatsApp Business';
  const mediaPath = String(value?.[0]?.image?.[0]?.path || '');

  return (
    <div className="min-h-[280px] w-full rounded-[12px] bg-[#e7ddd5] p-[16px] text-[#111b21]">
      <div className="mb-[16px] rounded-[8px] bg-[#075e54] px-[14px] py-[10px] text-white">
        <div className="text-[14px] font-medium">{name}</div>
        <div className="text-[11px] opacity-80">Business message preview</div>
      </div>
      <div className="ml-auto max-w-[82%] whitespace-pre-wrap rounded-[8px] rounded-tr-none bg-[#d9fdd3] px-[12px] py-[9px] text-[14px] shadow-sm">
        {!!mediaPath && (
          <img
            src={mediaDirectory.set(mediaPath)}
            alt="WhatsApp message media preview"
            className="mb-[9px] w-full rounded-[6px] object-cover"
          />
        )}
        {message}
        <div className="mt-[4px] text-right text-[10px] text-[#667781]">Preview</div>
      </div>
    </div>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: WhatsAppSettings,
  CustomPreviewComponent: WhatsAppPreview,
  dto: WhatsAppDto,
  maximumCharacters: 4096,
});
