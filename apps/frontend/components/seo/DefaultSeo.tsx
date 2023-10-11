import { DefaultSeo } from 'next-seo';
import LogoSvg from '../../public/images/logo.svg';

const DefaultSEO = () => {
  return (
    <DefaultSeo
      title="Clickvote"
      description="Seamlessly Integrate Like, Upvote, and Review Components into Your App."
      openGraph={{
        type: 'website',
        locale: 'en_US',
        url: 'https://clickvote.dev/',
        site_name: 'Clickvote',
        images: [
          {
            url: LogoSvg,
            width: 1200,
            height: 630,
            alt: 'Clickvote',
          },
        ],
      }}
    />
  );
};

export default DefaultSEO;
