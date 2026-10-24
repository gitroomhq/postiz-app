'use client';

import React, { FC, Fragment, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Textarea } from '@gitroom/react/form/textarea';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { Slider } from '@gitroom/react/form/slider';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type Integration = {
  id: string;
  name: string;
  picture: string;
  providerIdentifier: string;
  disabled: boolean;
  refreshNeeded: boolean;
};

type Post = {
  id: string;
  caption: string;
  thumbnail: string;
  url: string;
  date: string;
};

const splitList = (value: string) =>
  value
    .split(/[\n,،]/)
    .map((item) => item.trim())
    .filter(Boolean);

const useAutoReplies = () => {
  const fetch = useFetch();
  const load = useCallback(async () => (await fetch('/auto-replies')).json(), []);
  return useSWR('auto-replies', load);
};

const useAutoReplySetup = () => {
  const fetch = useFetch();
  const load = useCallback(
    async () => (await fetch('/auto-replies/setup')).json(),
    []
  );
  return useSWR('auto-replies-setup', load);
};

const useAutoReplyIntegrations = () => {
  const fetch = useFetch();
  const load = useCallback(
    async () => (await fetch('/auto-replies/integrations')).json(),
    []
  );
  return useSWR<Integration[]>('auto-replies-integrations', load);
};

const useRecentPosts = (integrationId: string) => {
  const fetch = useFetch();
  const load = useCallback(
    async () =>
      (await fetch(`/auto-replies/integrations/${integrationId}/posts`)).json(),
    [integrationId]
  );
  return useSWR<Post[]>(
    integrationId ? `auto-replies-posts-${integrationId}` : null,
    load,
    { revalidateOnFocus: false }
  );
};

const useAutoReplyLogs = (id: string) => {
  const fetch = useFetch();
  const load = useCallback(
    async () => (await fetch(`/auto-replies/${id}/logs`)).json(),
    [id]
  );
  return useSWR(`auto-replies-logs-${id}`, load, { refreshInterval: 10000 });
};

const useConversations = (integrationId: string) => {
  const fetch = useFetch();
  const load = useCallback(
    async () =>
      (
        await fetch(`/auto-replies/integrations/${integrationId}/conversations`)
      ).json(),
    [integrationId]
  );
  return useSWR(
    integrationId ? `auto-replies-conversations-${integrationId}` : null,
    load,
    { refreshInterval: 30000 }
  );
};

const useConversationMessages = (integrationId: string, conversationId: string) => {
  const fetch = useFetch();
  const load = useCallback(
    async () =>
      (
        await fetch(
          `/auto-replies/integrations/${integrationId}/conversations/${conversationId}`
        )
      ).json(),
    [integrationId, conversationId]
  );
  return useSWR(
    conversationId
      ? `auto-replies-messages-${integrationId}-${conversationId}`
      : null,
    load,
    { refreshInterval: 15000 }
  );
};

const SetupInfo: FC = () => {
  const t = useT();
  const toaster = useToaster();
  const { data } = useAutoReplySetup();
  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[8px] bg-sixth border-fifth border rounded-[4px] p-[16px] text-[14px]">
      <div className="font-[600]">
        {t('auto_replies_webhook_setup', 'Webhook setup (Meta app dashboard)')}
      </div>
      {data.providers?.map((p: { identifier: string; webhookUrl: string }) => (
        <div key={p.identifier} className="flex gap-[8px] items-center flex-wrap">
          <div className="text-customColor18">{p.identifier}</div>
          <code className="bg-newBgColorInner px-[8px] py-[4px] rounded-[4px] break-all" dir="ltr">
            {p.webhookUrl}
          </code>
          <Button
            className="!h-[32px]"
            onClick={() => {
              navigator.clipboard.writeText(p.webhookUrl);
              toaster.show(t('copied', 'Copied'), 'success');
            }}
          >
            {t('copy', 'Copy')}
          </Button>
        </div>
      ))}
      {!data.verifyTokenSet && (
        <div className="text-red-400">
          {t(
            'auto_replies_missing_verify_token',
            'AUTO_REPLIES_WEBHOOK_VERIFY_TOKEN is not set, Meta cannot verify the webhook'
          )}
        </div>
      )}
      {!data.messagingEnabled && (
        <div className="text-red-400">
          {t(
            'auto_replies_messaging_disabled',
            'Set INSTAGRAM_AUTO_REPLIES=true and reconnect Instagram (Standalone) to allow sending DMs'
          )}
        </div>
      )}
    </div>
  );
};

export const AutoReplies: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const modal = useModals();
  const toaster = useToaster();
  const { data, mutate } = useAutoReplies();

  const openEditor = useCallback(
    (item?: any) => () => {
      modal.openModal({
        title: item
          ? t('edit_auto_reply', 'Edit Auto Reply')
          : t('add_auto_reply', 'Add Auto Reply'),
        withCloseButton: true,
        children: <AddOrEditAutoReply data={item} reload={mutate} />,
      });
    },
    [mutate]
  );

  const openLogs = useCallback(
    (item: any) => () => {
      modal.openModal({
        title: `${t('activity', 'Activity')}: ${item.name}`,
        withCloseButton: true,
        size: '90%',
        children: <AutoReplyLogs id={item.id} />,
      });
    },
    []
  );

  const openInbox = useCallback(() => {
    modal.openModal({
      title: t('inbox', 'Inbox'),
      withCloseButton: true,
      size: '90%',
      children: <AutoReplyInbox />,
    });
  }, []);

  const remove = useCallback(
    (item: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete ${item.name}?`,
            { name: item.name }
          )
        )
      ) {
        await fetch(`/auto-replies/${item.id}`, { method: 'DELETE' });
        mutate();
        toaster.show(t('auto_reply_deleted', 'Auto reply deleted'), 'success');
      }
    },
    [mutate]
  );

  const changeActive = useCallback(
    (item: any) => async (value: 'on' | 'off') => {
      await fetch(`/auto-replies/${item.id}/active`, {
        method: 'POST',
        body: JSON.stringify({ active: value === 'on' }),
      });
      mutate();
    },
    [mutate]
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <div>
        <h3 className="text-[20px]">{t('auto_replies', 'Auto Replies')}</h3>
        <div className="text-customColor18 mt-[4px]">
          {t(
            'auto_replies_description',
            'Reply to comments and DMs automatically: a public reply under the comment and a private message with your content'
          )}
        </div>
      </div>
      <SetupInfo />
      <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
        {!!data?.length && (
          <div className="grid grid-cols-[2fr,1fr,1fr,auto,auto,auto,auto] w-full gap-[10px] items-center">
            <div>{t('name', 'Name')}</div>
            <div>{t('trigger', 'Trigger')}</div>
            <div>{t('sent_failed', 'Sent / Failed')}</div>
            <div />
            <div />
            <div />
            <div>{t('active', 'Active')}</div>
            {data.map((item: any) => (
              <Fragment key={item.id}>
                <div className="flex items-center gap-[8px] min-w-0">
                  {!!item.integration?.picture && (
                    <img
                      src={item.integration.picture}
                      className="w-[28px] h-[28px] rounded-full"
                      alt=""
                    />
                  )}
                  <div className="truncate">{item.name}</div>
                </div>
                <div className="text-[13px] text-customColor18">
                  {item.matchAnyPost
                    ? t('any_post', 'Any post')
                    : t('one_post', 'One post')}
                  {item.dmTriggerEnabled ? ` + ${t('dms', 'DMs')}` : ''}
                  <div className="truncate" dir="auto">
                    {item.matchAnyWord
                      ? t('any_comment', 'Any comment')
                      : item.keywords.join('، ')}
                  </div>
                </div>
                <div>
                  {item.stats?.SENT || 0} / {item.stats?.FAILED || 0}
                </div>
                <Button onClick={openLogs(item)}>
                  {t('activity', 'Activity')}
                </Button>
                <Button onClick={openEditor(item)}>{t('edit', 'Edit')}</Button>
                <Button onClick={remove(item)}>{t('delete', 'Delete')}</Button>
                <Slider
                  value={item.active ? 'on' : 'off'}
                  onChange={changeActive(item)}
                  fill={true}
                />
              </Fragment>
            ))}
          </div>
        )}
        <div className="flex gap-[10px]">
          <Button onClick={openEditor()}>
            {t('add_an_auto_reply', 'Add an auto reply')}
          </Button>
          <Button onClick={openInbox} className="!bg-transparent border border-fifth">
            {t('inbox', 'Inbox')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const PostPicker: FC<{
  integrationId: string;
  value: string;
  onChange: (post: Post) => void;
}> = ({ integrationId, value, onChange }) => {
  const t = useT();
  const { data, isLoading } = useRecentPosts(integrationId);

  if (isLoading) {
    return <div className="text-customColor18">{t('loading', 'Loading...')}</div>;
  }

  if (!data?.length) {
    return (
      <div className="text-customColor18">
        {t('no_posts_found', 'No posts found for this channel')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 mobile:grid-cols-3 gap-[8px] max-h-[260px] overflow-y-auto">
      {data.map((post) => (
        <div
          key={post.id}
          onClick={() => onChange(post)}
          title={post.caption}
          className={clsx(
            'cursor-pointer rounded-[6px] overflow-hidden border-2 aspect-square bg-newBgColorInner',
            post.id === value ? 'border-forth' : 'border-transparent'
          )}
        >
          {post.thumbnail ? (
            <img src={post.thumbnail} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="p-[6px] text-[11px]">{post.caption}</div>
          )}
        </div>
      ))}
    </div>
  );
};

const Section: FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-[8px] border border-fifth rounded-[8px] p-[16px]">
    <div className="font-[600]">{title}</div>
    {children}
  </div>
);

const AddOrEditAutoReply: FC<{ data?: any; reload: () => void }> = ({
  data,
  reload,
}) => {
  const fetch = useFetch();
  const t = useT();
  const modal = useModals();
  const toaster = useToaster();
  const { data: integrations } = useAutoReplyIntegrations();
  const [saving, setSaving] = useState(false);

  const form = useForm({
    values: {
      name: data?.name || '',
      integrationId: data?.integrationId || '',
      matchAnyPost: data ? String(!!data.matchAnyPost) : 'false',
      postId: data?.postId || '',
      postUrl: data?.postUrl || '',
      postThumbnail: data?.postThumbnail || '',
      keywords: (data?.keywords || []).join(', '),
      matchAnyWord: !!data?.matchAnyWord,
      wholeWordMatch: data ? !!data.wholeWordMatch : true,
      dmTriggerEnabled: !!data?.dmTriggerEnabled,
      dmMessage: data?.dmMessage || '',
      linkUrl: data?.linkUrl || '',
      linkButtonLabel: data?.linkButtonLabel || '',
      publicReplyEnabled: !!data?.publicReplyEnabled,
      publicReplyMessages: (data?.publicReplyMessages || []).join('\n'),
      openingDmEnabled: !!data?.openingDmEnabled,
      openingDmMessage: data?.openingDmMessage || '',
      openingDmButtonLabel: data?.openingDmButtonLabel || '',
      requireFollow: !!data?.requireFollow,
      followPromptMessage: data?.followPromptMessage || '',
      followPromptButtonLabel: data?.followPromptButtonLabel || '',
      followUpEnabled: !!data?.followUpEnabled,
      followUpMessage: data?.followUpMessage || '',
      followUpDelayMinutes: String(data?.followUpDelayMinutes ?? 0),
    },
  });

  const integrationId = form.watch('integrationId');
  const matchAnyPost = form.watch('matchAnyPost') === 'true';
  const postId = form.watch('postId');
  const matchAnyWord = form.watch('matchAnyWord');
  const publicReplyEnabled = form.watch('publicReplyEnabled');
  const openingDmEnabled = form.watch('openingDmEnabled');
  const requireFollow = form.watch('requireFollow');
  const followUpEnabled = form.watch('followUpEnabled');

  useEffect(() => {
    if (!integrationId && integrations?.length) {
      form.setValue('integrationId', integrations[0].id);
    }
  }, [integrations, integrationId]);

  const submit = useCallback(
    async (values: any) => {
      const keywords = splitList(values.keywords);
      const publicReplyMessages = values.publicReplyMessages
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean);

      const errors = [
        !values.name.trim() && t('auto_reply_name_required', 'Name is required'),
        !values.integrationId && t('auto_reply_channel_required', 'Choose a channel'),
        values.matchAnyPost !== 'true' &&
          !values.postId &&
          t('auto_reply_post_required', 'Choose a post or select "Any post"'),
        !values.matchAnyWord &&
          !keywords.length &&
          t('auto_reply_keywords_required', 'Add at least one keyword or reply to any comment'),
        !values.dmMessage.trim() && t('auto_reply_message_required', 'The DM message is required'),
        values.publicReplyEnabled &&
          !publicReplyMessages.length &&
          t('auto_reply_public_required', 'Add at least one public reply'),
        values.openingDmEnabled &&
          (!values.openingDmMessage.trim() || !values.openingDmButtonLabel.trim()) &&
          t('auto_reply_opening_required', 'The opening DM needs a message and a button label'),
      ].filter(Boolean);

      if (errors.length) {
        toaster.show(errors[0] as string, 'warning');
        return;
      }

      setSaving(true);
      try {
        const response = await (
          await fetch(data?.id ? `/auto-replies/${data.id}` : '/auto-replies', {
            method: data?.id ? 'PUT' : 'POST',
            body: JSON.stringify({
              name: values.name.trim(),
              integrationId: values.integrationId,
              matchAnyPost: values.matchAnyPost === 'true',
              postId: values.postId || undefined,
              postUrl: values.postUrl || undefined,
              postThumbnail: values.postThumbnail || undefined,
              keywords,
              matchAnyWord: values.matchAnyWord,
              wholeWordMatch: values.wholeWordMatch,
              dmTriggerEnabled: values.dmTriggerEnabled,
              dmMessage: values.dmMessage.trim(),
              linkUrl: values.linkUrl.trim() || undefined,
              linkButtonLabel: values.linkButtonLabel.trim() || undefined,
              publicReplyEnabled: values.publicReplyEnabled,
              publicReplyMessages,
              openingDmEnabled: values.openingDmEnabled,
              openingDmMessage: values.openingDmMessage.trim() || undefined,
              openingDmButtonLabel: values.openingDmButtonLabel.trim() || undefined,
              requireFollow: values.requireFollow,
              followPromptMessage: values.followPromptMessage.trim() || undefined,
              followPromptButtonLabel: values.followPromptButtonLabel.trim() || undefined,
              followUpEnabled: values.followUpEnabled,
              followUpMessage: values.followUpMessage.trim() || undefined,
              followUpDelayMinutes: Math.max(
                0,
                parseInt(values.followUpDelayMinutes, 10) || 0
              ),
              active: data ? !!data.active : true,
            }),
          })
        ).json();

        if (!response?.success) {
          toaster.show(
            response?.error ||
              (Array.isArray(response?.message)
                ? response.message[0]
                : t('auto_reply_save_failed', 'Could not save the auto reply')),
            'warning'
          );
          return;
        }

        toaster.show(
          response.subscribed
            ? t('auto_reply_saved', 'Auto reply saved')
            : t(
                'auto_reply_saved_not_subscribed',
                'Saved, but the account could not subscribe to webhooks, check the channel permissions'
              ),
          response.subscribed ? 'success' : 'warning'
        );
        modal.closeAll();
        reload();
      } finally {
        setSaving(false);
      }
    },
    [data]
  );

  if (integrations && !integrations.length) {
    return (
      <div className="text-customColor18">
        {t(
          'auto_replies_no_channels',
          'Connect an Instagram (Standalone) channel first, it is the channel that supports auto replies'
        )}
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-[16px] w-[720px] max-w-full">
        <Input label="Name" translationKey="label_name" {...form.register('name')} />

        <Select label="Channel" translationKey="label_channel" {...form.register('integrationId')}>
          {integrations?.map((integration) => (
            <option key={integration.id} value={integration.id}>
              {integration.name}
              {integration.refreshNeeded || integration.disabled ? ' (!)' : ''}
            </option>
          ))}
        </Select>

        <Section title={t('auto_reply_trigger', 'Trigger')}>
          <Select label="Comments on" translationKey="label_comments_on" {...form.register('matchAnyPost')}>
            <option value="false">{t('a_specific_post', 'A specific post')}</option>
            <option value="true">{t('any_post', 'Any post')}</option>
          </Select>
          {!matchAnyPost && !!integrationId && (
            <PostPicker
              integrationId={integrationId}
              value={postId}
              onChange={(post) => {
                form.setValue('postId', post.id);
                form.setValue('postUrl', post.url);
                form.setValue('postThumbnail', post.thumbnail);
              }}
            />
          )}
          <Checkbox
            {...form.register('matchAnyWord')}
            label={t('reply_to_any_comment', 'Reply to any comment (no keywords)')}
          />
          {!matchAnyWord && (
            <>
              <Input
                label="Keywords (comma separated)"
                translationKey="label_keywords_comma"
                dir="auto"
                {...form.register('keywords')}
              />
              <Checkbox
                {...form.register('wholeWordMatch')}
                label={t('whole_word_match', 'Whole word only ("link" does not match "linking")')}
              />
            </>
          )}
          <Checkbox
            {...form.register('dmTriggerEnabled')}
            label={t('dm_trigger', 'Also reply when the keyword arrives as a DM or story reply')}
          />
        </Section>

        <Section title={t('public_reply', 'Public reply under the comment')}>
          <Checkbox {...form.register('publicReplyEnabled')} label={t('enable', 'Enable')} />
          {publicReplyEnabled && (
            <Textarea
              label="Replies, one per line (picked at random)"
              translationKey="label_public_replies"
              dir="auto"
              className="!min-h-[100px]"
              {...form.register('publicReplyMessages')}
            />
          )}
        </Section>

        <Section title={t('private_message', 'Private message')}>
          <Textarea
            label="Message ({username} and {link} are replaced)"
            translationKey="label_dm_message"
            dir="auto"
            className="!min-h-[100px]"
            {...form.register('dmMessage')}
          />
          <div className="grid grid-cols-[2fr,1fr] mobile:grid-cols-1 gap-[10px]">
            <Input label="Link (optional)" translationKey="label_link_optional" dir="ltr" {...form.register('linkUrl')} />
            <Input label="Button label" translationKey="label_button_label" maxLength={20} {...form.register('linkButtonLabel')} />
          </div>
        </Section>

        <Section title={t('opening_dm', 'Opening DM with a button')}>
          <div className="text-[13px] text-customColor18">
            {t(
              'opening_dm_hint',
              'The first private reply is a short message with a button, the content is sent when they tap it'
            )}
          </div>
          <Checkbox {...form.register('openingDmEnabled')} label={t('enable', 'Enable')} />
          {openingDmEnabled && (
            <div className="grid grid-cols-[2fr,1fr] mobile:grid-cols-1 gap-[10px]">
              <Input label="Opening message" translationKey="label_opening_message" dir="auto" {...form.register('openingDmMessage')} />
              <Input label="Button label" translationKey="label_button_label" maxLength={20} {...form.register('openingDmButtonLabel')} />
            </div>
          )}
        </Section>

        <Section title={t('require_follow', 'Followers only')}>
          <Checkbox {...form.register('requireFollow')} label={t('enable', 'Enable')} />
          {requireFollow && (
            <div className="grid grid-cols-[2fr,1fr] mobile:grid-cols-1 gap-[10px]">
              <Input label="Follow prompt" translationKey="label_follow_prompt" dir="auto" {...form.register('followPromptMessage')} />
              <Input label="Button label" translationKey="label_button_label" maxLength={20} {...form.register('followPromptButtonLabel')} />
            </div>
          )}
        </Section>

        <Section title={t('follow_up', 'Follow-up message')}>
          <Checkbox {...form.register('followUpEnabled')} label={t('enable', 'Enable')} />
          {followUpEnabled && (
            <div className="grid grid-cols-[2fr,1fr] mobile:grid-cols-1 gap-[10px]">
              <Input label="Message" translationKey="label_message" dir="auto" {...form.register('followUpMessage')} />
              <Input label="Delay (minutes)" translationKey="label_delay_minutes" type="number" min={0} max={1380} {...form.register('followUpDelayMinutes')} />
            </div>
          )}
        </Section>

        <div>
          <Button type="submit" loading={saving}>
            {t('save', 'Save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const statusColor: Record<string, string> = {
  SENT: 'text-green-400',
  FAILED: 'text-red-400',
  PENDING: 'text-yellow-400',
};

const AutoReplyLogs: FC<{ id: string }> = ({ id }) => {
  const t = useT();
  const { data, isLoading } = useAutoReplyLogs(id);

  if (isLoading) {
    return <div>{t('loading', 'Loading...')}</div>;
  }

  if (!data?.length) {
    return (
      <div className="text-customColor18">
        {t('no_activity_yet', 'No activity yet')}
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-[auto,1fr,2fr,auto,2fr] gap-x-[12px] gap-y-[8px] text-[13px]">
        <div>{t('date', 'Date')}</div>
        <div>{t('user', 'User')}</div>
        <div>{t('text', 'Text')}</div>
        <div>{t('status', 'Status')}</div>
        <div>{t('details', 'Details')}</div>
        {data.map((log: any) => (
          <Fragment key={log.id}>
            <div className="whitespace-nowrap">
              {new Date(log.createdAt).toLocaleString()}
            </div>
            <div className="truncate">{log.userName || log.userId}</div>
            <div className="truncate" dir="auto">{log.text}</div>
            <div className={statusColor[log.status] || 'text-customColor18'}>
              {log.status}
              {log.publicReplySentAt
                ? ` + ${t('public_reply_sent', 'public reply')}`
                : ''}
            </div>
            <div className="text-customColor18 break-words">
              {[log.errorMessage, log.publicReplyError]
                .filter(Boolean)
                .join(' | ')}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const AutoReplyInbox: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data: integrations } = useAutoReplyIntegrations();
  const [integrationId, setIntegrationId] = useState('');
  const [conversation, setConversation] = useState<{
    id: string;
    userId: string;
    userName: string;
  } | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!integrationId && integrations?.length) {
      setIntegrationId(integrations[0].id);
    }
  }, [integrations]);

  const { data: conversations, isLoading } = useConversations(integrationId);
  const { data: messages, mutate } = useConversationMessages(
    integrationId,
    conversation?.id || ''
  );

  const send = useCallback(async () => {
    if (!conversation || !text.trim()) {
      return;
    }
    setSending(true);
    try {
      const response = await (
        await fetch(`/auto-replies/integrations/${integrationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ userId: conversation.userId, message: text.trim() }),
        })
      ).json();
      if (!response?.success) {
        toaster.show(response?.error || t('send_failed', 'Could not send'), 'warning');
        return;
      }
      setText('');
      mutate();
    } finally {
      setSending(false);
    }
  }, [conversation, text, integrationId]);

  return (
    <div className="flex flex-col gap-[12px] h-[70vh]">
      <select
        className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] px-[12px] w-[300px] max-w-full"
        value={integrationId}
        onChange={(e) => {
          setIntegrationId(e.target.value);
          setConversation(null);
        }}
      >
        {integrations?.map((integration) => (
          <option key={integration.id} value={integration.id}>
            {integration.name}
          </option>
        ))}
      </select>
      {conversations && !conversations.success && (
        <div className="text-red-400 text-[13px]">{conversations.error}</div>
      )}
      <div className="flex flex-1 min-h-0 gap-[12px] mobile:flex-col">
        <div className="w-[280px] mobile:w-full shrink-0 overflow-y-auto border border-fifth rounded-[8px]">
          {isLoading && <div className="p-[12px]">{t('loading', 'Loading...')}</div>}
          {conversations?.conversations?.map((c: any) => (
            <div
              key={c.id}
              onClick={() => setConversation(c)}
              className={clsx(
                'p-[12px] cursor-pointer border-b border-fifth hover:bg-boxHover',
                conversation?.id === c.id && 'bg-boxHover'
              )}
            >
              <div className="font-[600] truncate">{c.userName || c.userId}</div>
              <div className="text-[12px] text-customColor18 truncate" dir="auto">
                {c.lastMessage}
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col min-h-0 border border-fifth rounded-[8px]">
          {!conversation ? (
            <div className="m-auto text-customColor18">
              {t('choose_conversation', 'Choose a conversation')}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-[12px] flex flex-col gap-[8px]">
                {messages?.messages?.map((m: any) => (
                  <div
                    key={m.id}
                    dir="auto"
                    className={clsx(
                      'max-w-[75%] px-[12px] py-[8px] rounded-[12px] whitespace-pre-wrap',
                      m.fromMe ? 'self-end bg-forth text-white' : 'self-start bg-newBgColorInner'
                    )}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-[8px] p-[12px] border-t border-fifth">
                <input
                  value={text}
                  dir="auto"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      send();
                    }
                  }}
                  placeholder={t('write_a_message', 'Write a message...')}
                  className="flex-1 bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] px-[12px] outline-none"
                />
                <Button onClick={send} loading={sending}>
                  {t('send', 'Send')}
                </Button>
              </div>
              <div className="px-[12px] pb-[8px] text-[11px] text-customColor18">
                {t(
                  'messaging_window_hint',
                  'Instagram only allows replies within 24 hours of the last message from the user'
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
