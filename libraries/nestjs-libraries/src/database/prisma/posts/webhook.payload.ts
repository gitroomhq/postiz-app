function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function shapeWebhookPosts<
  T extends { image?: string | null; settings?: string | null },
>(posts: T[]) {
  return posts.map((post) => ({
    ...post,
    image: parseJsonField(post.image, [] as unknown[]),
    settings: parseJsonField(post.settings, {} as Record<string, unknown>),
  }));
}

const SAMPLE_IMAGE = [
  {
    id: 'img-1',
    path: 'https://uploads.gitroom.com/F6LSCD8wrrQ.jpeg',
  },
];

const SAMPLE_SETTINGS = {
  __type: 'youtube',
  title: 'Test video title',
  type: 'public',
};

export function enrichWebhookTestPayload(body: unknown) {
  const list = Array.isArray(body)
    ? body
    : body && typeof body === 'object'
      ? [body]
      : [];

  const enriched = list.map((post) => {
    const item = (post ?? {}) as Record<string, unknown>;
    return {
      ...item,
      image: item.image ?? SAMPLE_IMAGE,
      settings: item.settings ?? SAMPLE_SETTINGS,
    };
  });

  return Array.isArray(body) ? enriched : enriched[0] ?? [];
}
