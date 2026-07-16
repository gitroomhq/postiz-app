import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { sanitizePostContent } from '@gitroom/helpers/utils/sanitize.post.content';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getBrandName } from '@gitroom/helpers/utils/brand';
import SafeImage from '@gitroom/react/helpers/safe.image';
import Link from 'next/link';
import { CommentsComponents } from '@gitroom/frontend/components/preview/comments.components';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { CopyClient } from '@gitroom/frontend/components/preview/copy.client';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { RenderPreviewDateClient } from '@gitroom/frontend/components/preview/render.preview.date.client';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';

dayjs.extend(utc);
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? getBrandName() : 'Gitroom'} Preview`,
  description: '',
};
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
  if (!post.length) {
    return (
      <div className="text-white fixed start-0 top-0 w-full h-full flex justify-center items-center text-[20px]">
        {t('post_not_found', 'Post not found')}
      </div>
    );
  }
  return (
    <div>
      <div className="mx-auto w-full max-w-[1346px] py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="min-w-[55px]">
                <Link
                  href="/"
                  className="text-2xl flex items-center justify-center gap-[10px] text-textColor order-1"
                >
                  <div className="max-w-[55px]">
                    <SafeImage
                      src={'/postiz.svg'}
                      width={55}
                      height={55}
                      alt="Logo"
                    />
                  </div>
                  <div>
                    <svg
                      width="200"
                      height="75"
                      viewBox="0 0 200 75"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <text
                        x="0"
                        y="52"
                        fontFamily="Arial, Helvetica, sans-serif"
                        fontWeight="700"
                        fontSize="38"
                        fill="currentColor"
                      >
                        MediaPublish
                      </text>
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-400 flex items-center gap-[20px]">
            {!!searchParams?.share && (
              <div>
                <CopyClient />
              </div>
            )}
            <div className="flex-1">
              {t('publication_date', 'Publication Date:')}{' '}
              <RenderPreviewDateClient date={post[0].publishDate} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row text-white w-full max-w-[1346px] mx-auto">
        <div className="flex-1">
          <div className="gap-[20px] flex flex-col">
            {post.map((p: any, index: number) => (
              <div
                key={String(p.id)}
                className="relative px-4 py-4 bg-third border border-tableBorder"
              >
                <div className="flex space-x-3">
                  <div>
                    <div className="flex shrink-0 rounded-full h-30 w-30 relative">
                      <div className="w-[50px] h-[50px] z-[20]">
                        <img
                          className="w-full h-full relative z-[20] bg-black aspect-square rounded-full border-tableBorder"
                          alt={post[0].integration.name}
                          src={post[0].integration.picture}
                        />
                      </div>
                      <div className="absolute -end-[5px] -bottom-[5px] w-[30px] h-[30px] z-[20]">
                        <img
                          className="w-full h-full bg-black aspect-square rounded-full border-tableBorder"
                          alt={post[0].integration.providerIdentifier}
                          src={`/icons/platforms/${post[0].integration.providerIdentifier}.png`}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-semibold">
                        {post[0].integration.name}
                      </h2>
                      <span className="text-sm text-gray-500">
                        @{post[0].integration.profile}
                      </span>
                      {index === 0 && (
                        <CreationMethodBadge
                          creationMethod={p.creationMethod}
                          size="md"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-[20px]">
                      <div
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: sanitizePostContent(p.content),
                        }}
                      />
                      <div className="flex w-full gap-[10px]">
                        {JSON.parse(p?.image || '[]').map((p: any) => (
                          <div
                            key={p.name}
                            className="flex-1 rounded-[10px] max-h-[500px] overflow-hidden"
                          >
                            <VideoOrImage
                              isContain={true}
                              src={p.path}
                              autoplay={true}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-96 lg:flex-shrink-0">
          <div className="p-4 pt-0">
            <CommentsComponents postId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
