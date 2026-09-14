/**
 * In-app notifications store a single HTML/text blob. Publish success used to
 * dump the live URL inline, which overflowed the 380px panel and sat on a
 * parent `cursor-pointer` so the link was not actually clickable. Split the
 * URL out and classify success vs fail so the row can show a green tick.
 */

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export type NotificationKind = 'success' | 'fail' | 'info';

export type SplitNotification = {
  text: string;
  url: string | null;
  kind: NotificationKind;
};

function trimUrl(raw: string): string {
  return raw.replace(/[),.;!?]+$/g, '');
}

function kindFrom(content: string): NotificationKind {
  if (
    /couldn['’]t publish|error posting|was not published|an error occurred/i.test(
      content
    )
  ) {
    return 'fail';
  }
  if (/has been published/i.test(content)) {
    return 'success';
  }
  return 'info';
}

export function splitNotificationContent(content: string): SplitNotification {
  const found = content.match(URL_RE);
  const url = found?.[0] ? trimUrl(found[0]) : null;
  const text = content
    .replace(URL_RE, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+at\s*$/i, '')
    .trim();
  return {
    text: text || content.trim(),
    url,
    kind: kindFrom(content),
  };
}
