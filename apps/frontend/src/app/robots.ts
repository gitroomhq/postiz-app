import type { MetadataRoute } from 'next';

/**
 * Mostly-authed app: keep crawlers on public auth + share preview surfaces.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/auth', '/p/'],
      disallow: [
        '/launches',
        '/billing',
        '/channels',
        '/media',
        '/analytics',
        '/settings',
        '/connections',
        '/agents',
        '/plugs',
        '/admin',
        '/third-party',
        '/integrations',
        '/oauth',
        '/api',
      ],
    },
  };
}
