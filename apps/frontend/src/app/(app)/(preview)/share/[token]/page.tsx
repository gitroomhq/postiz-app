import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import Image from 'next/image';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { PublicReviewActions } from '@gitroom/frontend/components/review/public.review.actions';

dayjs.extend(utc);

type PreviewPost = {
  id: string;
  content?: string;
  image?: string;
  integration?: {
    name?: string;
    picture?: string;
    providerIdentifier?: string;
    profile?: string;
  };
};

function extractPosts(payload: any): PreviewPost[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.post)) return payload.post;
  if (Array.isArray(payload?.preview)) return payload.preview;
  return [];
}

function parseMedia(image: string | undefined) {
  if (!image) return [];
  try {
    return JSON.parse(image);
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Share Review`,
  description: '',
};

export default async function ShareReviewPage({
  params: { token },
}: {
  params: {
    token: string;
  };
}) {
  const response = await internalFetch(`/public/review/${token}`);
  const payload = await response.json().catch(() => ({}));
  const posts = extractPosts(payload);
  const firstPost = posts[0];
  const status = payload?.status || 'PENDING';
  const expiresAt = payload?.expiresAt;

  if (!response.ok) {
    return (
      <div className="text-white fixed start-0 top-0 w-full h-full flex justify-center items-center text-[20px] text-center p-4">
        {payload?.message || 'This review link is invalid or expired.'}
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="text-white fixed start-0 top-0 w-full h-full flex justify-center items-center text-[20px] text-center p-4">
        No post preview is available for this review token.
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="mx-auto w-full max-w-[1346px] py-4 px-4 lg:px-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Image src="/postiz.svg" width={42} height={42} alt="Postiz logo" />
            <div>
              <h1 className="text-[20px] font-semibold">External Review</h1>
              <p className="text-sm text-gray-400">
                Please review and approve this scheduled post.
              </p>
            </div>
          </div>
          {!!payload?.scheduledAt && (
            <div className="text-sm text-gray-400">
              Scheduled for {dayjs(payload.scheduledAt).format('MMM D, YYYY h:mm A')}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row text-white w-full max-w-[1346px] mx-auto gap-5 px-4 lg:px-0 pb-6">
        <div className="flex-1">
          <div className="gap-[20px] flex flex-col">
            {posts.map((post) => (
              <div
                key={String(post.id)}
                className="relative px-4 py-4 bg-third border border-tableBorder rounded-[10px]"
              >
                <div className="flex space-x-3">
                  <div className="flex shrink-0 rounded-full h-30 w-30 relative">
                    <div className="w-[50px] h-[50px] z-[20]">
                      <img
                        className="w-full h-full relative z-[20] bg-black aspect-square rounded-full border-tableBorder"
                        alt={firstPost?.integration?.name || 'Integration'}
                        src={firstPost?.integration?.picture || '/no-picture.jpg'}
                      />
                    </div>
                    {!!firstPost?.integration?.providerIdentifier && (
                      <div className="absolute -end-[5px] -bottom-[5px] w-[30px] h-[30px] z-[20]">
                        <img
                          className="w-full h-full bg-black aspect-square rounded-full border-tableBorder"
                          alt={firstPost.integration.providerIdentifier}
                          src={`/icons/platforms/${firstPost.integration.providerIdentifier}.png`}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-semibold">
                        {firstPost?.integration?.name || 'Connected Account'}
                      </h2>
                      {!!firstPost?.integration?.profile && (
                        <span className="text-sm text-gray-500">
                          @{firstPost.integration.profile}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-[20px]">
                      <div
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: post.content || '',
                        }}
                      />
                      <div className="flex w-full gap-[10px]">
                        {parseMedia(post.image).map((media: { name: string; path: string }) => (
                          <div
                            key={media.name}
                            className="flex-1 rounded-[10px] max-h-[500px] overflow-hidden"
                          >
                            <VideoOrImage
                              isContain={true}
                              src={media.path}
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

        <div className="w-full lg:w-[360px] lg:flex-shrink-0">
          <PublicReviewActions
            token={token}
            initialStatus={status}
            expiresAt={expiresAt}
            initialFeedback={payload?.feedback}
          />
        </div>
      </div>
    </div>
  );
}
