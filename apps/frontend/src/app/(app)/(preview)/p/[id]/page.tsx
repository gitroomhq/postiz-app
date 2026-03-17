import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import Link from 'next/link';
import { CommentsComponents } from '@gitroom/frontend/components/preview/comments.components';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { CopyClient } from '@gitroom/frontend/components/preview/copy.client';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import dynamicLoad from 'next/dynamic';

const RenderPreviewDate = dynamicLoad(
  () =>
    import('@gitroom/frontend/components/preview/render.preview.date').then(
      (mod) => mod.RenderPreviewDate
    ),
  { ssr: false }
);

dayjs.extend(utc);
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postra' : 'Gitroom'} Preview`,
  description: '',
};
export default async function Auth({
  params: { id },
  searchParams,
}: {
  params: {
    id: string;
  };
  searchParams?: {
    share?: string;
  };
}) {
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
                  <svg
                    width="55"
                    height="55"
                    viewBox="0 0 3200 3200"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M1342.207,634.477c82.961,1.182 175.524,12.705 298.981,105.871c14.189,10.707 157.597,161.55 166.797,298.711c0.319,4.75 -16.727,21.026 -157.869,277.345c-6.194,11.249 -73.62,133.696 -78.221,140.169c-0.004,0.005 -25.966,11.41 -37.888,-5.865c-41.924,-60.754 -165.235,-286.39 -172.803,-285.62c-11.206,1.14 -474.853,817.445 -633.341,1084.132c-48.5,81.611 -84.826,164.647 -23.055,280.399c28.092,52.641 61.948,70.376 69.132,74.139c14.82,7.763 119.648,62.675 208.524,15.91c100.354,-52.805 113.831,-111.77 245.672,-337.766c33.642,-57.668 33.018,-57.995 418.842,-721.835c337.562,-580.803 321.924,-593.091 408.293,-673.489c51.166,-47.629 87.28,-55.887 96.025,-57.886c28.974,-6.625 73.168,-18.357 144.194,3.592c11.92,3.684 87.436,54.423 120.17,123.186c22.176,46.584 21.291,47.645 19.548,99.197c-3.481,102.975 -43.557,135.067 -206.469,424.49c-4.291,7.622 -573.474,993.744 -687.957,1193.458c-82.384,143.718 -151.773,282.057 -404.76,391.64c-152.763,66.171 -726.732,125.27 -918.937,-487.662c-6.51,-20.759 -20.197,-122.903 -15.896,-181.304c19.444,-264.02 115.9,-357.688 342.301,-752.363c38.338,-66.832 466.933,-813.986 481.064,-834.346c31.011,-44.681 63.725,-79.99 151.307,-127.097c24.488,-13.171 99.994,-44.688 166.347,-47.005Z" />
                    <path d="M2582.71,3099.932c-12.936,-1.347 -28.817,4.067 -77.258,-30.74c-17.955,-12.902 -34.523,-26.619 -56.183,-49.631c-20.912,-22.217 -42.206,-44.841 -199.335,-325.143c-174.381,-311.078 -304.727,-494.231 -271.866,-545.025c80.269,-124.074 114.971,-202.355 166.494,-288.884c65.151,-109.414 58.673,-116.683 69.551,-117.999c26.38,-3.191 27.398,0.679 42.483,22.405c8.498,12.239 350.733,609.38 381.134,662.426c122.187,213.196 208.741,304.214 219.883,446.113c1.019,12.981 -10.778,80.218 -35.652,120.963c-68.635,112.427 -161.528,112.909 -239.251,105.517Z" />
                    <path d="M2520.334,309.286c17.2,0.81 16.962,0.605 34.274,2.443c9.399,0.997 58.113,6.168 105.501,53.168c106.489,105.618 75.284,214.652 60.645,264.93c-2.096,7.199 -9.525,32.716 -58.502,73.231c-51.562,42.653 -91.813,65.373 -173.187,60.947c-90.743,-4.935 -162.111,-70.917 -189.603,-122.392c-40.391,-75.628 -26.75,-126.19 -23.799,-143.364c11.411,-66.409 45.88,-113.945 54.98,-120.334c101.72,-71.421 162.25,-67.217 189.691,-68.628Z" />
                  </svg>
                  <span className="text-[24px] font-[700]">Postra</span>
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
              <RenderPreviewDate date={post[0].publishDate} />
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
                    </div>
                    <div className="flex flex-col gap-[20px]">
                      <div
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: p.content,
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
