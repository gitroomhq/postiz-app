import type { Metadata } from 'next';
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { sanitizePostContent } from '@gitroom/helpers/utils/sanitize.post.content';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { PreviewCommentsPane } from '@gitroom/frontend/components/preview/comments.components';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { CopyClient } from '@gitroom/frontend/components/preview/copy.client';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { RenderPreviewDateClient } from '@gitroom/frontend/components/preview/render.preview.date.client';
import { formatChannelHandle } from '@gitroom/frontend/components/channels/channel-handle';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';

function absoluteMediaUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.FRONTEND_URL || 'http://localhost:4200';
  try {
    return new URL(path.startsWith('/') ? path : `/${path}`, base).toString();
  } catch {
    return undefined;
  }
}

function parsePostMedia(image: unknown): Array<{ name?: string; path?: string }> {
  if (Array.isArray(image)) {
    return image as Array<{ name?: string; path?: string }>;
  }
  if (typeof image !== 'string' || !image) {
    return [];
  }
  try {
    const parsed = JSON.parse(image);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const post = await (await internalFetch(`/public/posts/${id}`)).json();
    if (!Array.isArray(post) || !post.length) {
      return { title: 'Post not found' };
    }
    const name = post[0].integration?.name || 'Post';
    const text = stripHtmlValidation(
      'none',
      post[0].content || '',
      false,
      true,
      false
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    const title = text ? `${name}: ${text}` : name;
    const description =
      text || 'Shared with PostQueen — schedule posts across 30+ channels.';
    const images = (() => {
      return parsePostMedia(post[0].image)
        .map((m) => absoluteMediaUrl(m.path))
        .filter(Boolean) as string[];
    })();
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        ...(images.length ? { images } : {}),
      },
      twitter: {
        card: images.length ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(images.length ? { images } : {}),
      },
    };
  } catch {
    return { title: 'Preview' };
  }
}

export default async function Auth(
  props: {
    params: Promise<{
      id: string;
    }>;
    searchParams?: Promise<{
      share?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    id
  } = params;

  const post = await (await internalFetch(`/public/posts/${id}`)).json();
  const t = await getT();
  if (!Array.isArray(post) || !post.length) {
    return (
      <div className="fixed start-0 top-0 flex h-full w-full items-center justify-center text-[20px] text-pqText">
        {t('post_not_found', 'Post not found')}
      </div>
    );
  }

  const integration = post[0].integration || {
    name: '',
    picture: '',
    providerIdentifier: '',
    profile: '',
  };
  const profileHandle = formatChannelHandle(integration.profile);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-[20px] px-[16px] py-[20px] md:px-[24px] md:py-[28px]">
      <header className="flex flex-col gap-[12px] border-b border-pqBorder pb-[16px] md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="flex items-center gap-[10px] text-[20px] text-pqText"
        >
          <LogoTextComponent />
        </Link>
        <div className="flex flex-col gap-[10px] text-[13px] text-pqMuted md:flex-row md:items-center md:gap-[16px]">
          {!!searchParams?.share && <CopyClient />}
          <div>
            <span className="text-pqSoft">
              {t('publication_date', 'Publication Date:')}{' '}
            </span>
            <span className="text-pqText">
              <RenderPreviewDateClient date={post[0].publishDate} />
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-[16px] lg:flex-row lg:items-start lg:gap-[20px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
          {post.map((p: any, index: number) => {
            const media = parsePostMedia(p?.image);
            return (
            <article
              key={String(p.id)}
              className="rounded-[14px] border border-pqBorder bg-pqInner p-[18px] md:p-[20px]"
            >
              <div className="flex gap-[12px]">
                <div className="relative h-[50px] w-[50px] shrink-0">
                  <img
                    className="aspect-square h-full w-full rounded-full border border-pqBorder bg-pqAvatarBg"
                    alt={integration.name}
                    src={integration.picture}
                  />
                  <div className="absolute -bottom-[4px] -end-[4px] h-[24px] w-[24px]">
                    <img
                      className="aspect-square h-full w-full rounded-full border border-pqBorder bg-pqAvatarBg"
                      alt={integration.providerIdentifier}
                      src={`/icons/platforms/${integration.providerIdentifier}.png`}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-[10px]">
                  <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
                    <h2 className="text-[14px] font-[600] text-pqText">
                      {integration.name}
                    </h2>
                    {!!profileHandle && (
                      <span className="text-[13px] text-pqMuted">
                        {profileHandle}
                      </span>
                    )}
                    {index === 0 && (
                      <CreationMethodBadge
                        creationMethod={p.creationMethod}
                        size="md"
                      />
                    )}
                  </div>
                  <div
                    className="whitespace-pre-wrap text-[14px] leading-[1.5] text-pqText"
                    dangerouslySetInnerHTML={{
                      __html: sanitizePostContent(p.content),
                    }}
                  />
                  {!!media.length && (
                    <div className="flex w-full snap-x snap-mandatory gap-[10px] overflow-x-auto">
                      {media.map((item: { name?: string; path?: string }, mediaIndex: number) => (
                        <div
                          key={item.name || item.path || String(mediaIndex)}
                          className="max-h-[500px] min-w-[80%] flex-none snap-center overflow-hidden rounded-[10px] sm:min-w-0 sm:flex-1"
                        >
                          <VideoOrImage
                            isContain={true}
                            src={item.path || ''}
                            autoplay={true}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
            );
          })}
        </div>

        <aside className="w-full shrink-0 lg:w-[320px]">
          <div className="rounded-[14px] border border-pqBorder bg-pqInner p-[18px]">
            <PreviewCommentsPane postId={id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
