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
