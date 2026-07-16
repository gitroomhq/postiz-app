export const getBrandName = () => process.env.NEXT_PUBLIC_APP_NAME || 'MediaPublish';

export const getBrandDomain = () =>
  process.env.NEXT_PUBLIC_APP_DOMAIN || 'media-publish.com';

export const getBrandLegalUrl = () =>
  process.env.NEXT_PUBLIC_APP_LEGAL_URL || `https://${getBrandDomain()}`;
