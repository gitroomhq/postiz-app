import { apiFetch } from '@/src/api/client';

export type PostListFilter = 'all' | 'scheduled' | 'draft' | 'published' | 'failed';

export type PostState = 'QUEUE' | 'DRAFT' | 'PUBLISHED' | 'ERROR';

export type PostListItem = {
  body?: string;
  content?: string;
  creationMethod?: string;
  error?: string | null;
  group?: string;
  image?: CreatePostMedia[];
  id: string;
  integration?: {
    id: string;
    name?: string;
    picture?: string;
    providerIdentifier?: string;
  };
  intervalInDays?: number | null;
  publishDate: string;
  releaseId?: string | null;
  releaseURL?: string | null;
  state: PostState;
  tags?: Array<{ tag: { color?: string; id: string; name: string } }>;
};

export type PostListResponse = {
  hasMore: boolean;
  limit: number;
  page: number;
  posts: PostListItem[];
  total: number;
};

type MinifiedPostListResponse = {
  hm?: boolean;
  l?: number;
  p?: unknown[];
  pg?: number;
  t?: number;
};

export type PostDetailResponse = {
  group?: string;
  integration?: string;
  integrationPicture?: string;
  posts: PostListItem[];
  settings?: Record<string, unknown>;
};

function toQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

function expandTagWrapper(value: any) {
  if (!value?.t) {
    return value;
  }

  return {
    tag: {
      color: value.t.c,
      id: value.t.i,
      name: value.t.n,
    },
  };
}

function expandPostListItem(value: any): PostListItem {
  if (value?.id) {
    return value as PostListItem;
  }

  return {
    content: value?.c,
    creationMethod: value?.cm,
    group: value?.g,
    id: value?.i,
    integration: value?.n
      ? {
          id: value.n.i,
          name: value.n.n,
          picture: value.n.p,
          providerIdentifier: value.n.pi,
        }
      : undefined,
    intervalInDays: value?.iv,
    publishDate: value?.d,
    releaseId: value?.ri,
    releaseURL: value?.u,
    state: value?.s,
    tags: Array.isArray(value?.tg) ? value.tg.map(expandTagWrapper) : undefined,
  };
}

function hasPostListShape(value: PostListItem): value is PostListItem {
  return !!value.id && !!value.publishDate && !!value.state;
}

function normalizePostListResponse(response: PostListResponse | MinifiedPostListResponse): PostListResponse {
  const rawPosts = Array.isArray((response as PostListResponse).posts)
    ? (response as PostListResponse).posts
    : Array.isArray((response as MinifiedPostListResponse).p)
    ? ((response as MinifiedPostListResponse).p as unknown[])
    : [];
  const posts = rawPosts.map(expandPostListItem).filter(hasPostListShape);

  return {
    hasMore: Boolean(
      (response as PostListResponse).hasMore ?? (response as MinifiedPostListResponse).hm
    ),
    limit: (response as PostListResponse).limit ?? (response as MinifiedPostListResponse).l ?? posts.length,
    page: (response as PostListResponse).page ?? (response as MinifiedPostListResponse).pg ?? 0,
    posts,
    total: (response as PostListResponse).total ?? (response as MinifiedPostListResponse).t ?? posts.length,
  };
}

export async function getPostList(filter: PostListFilter, page = 0, limit = 25) {
  const response = await apiFetch<PostListResponse | MinifiedPostListResponse>(
    `/posts/list?${toQuery({ limit, page, state: filter })}`,
    {
      method: 'GET',
    }
  );

  return normalizePostListResponse(response);
}

export function getPostDetail(id: string) {
  return apiFetch<PostDetailResponse>(`/posts/${id}`, {
    method: 'GET',
  });
}

export function getPostGroup(group: string) {
  return apiFetch<PostDetailResponse>(`/posts/group/${group}`, {
    method: 'GET',
  });
}

export function findFreeSlot(integrationId?: string) {
  return apiFetch<{ date: string }>(integrationId ? `/posts/find-slot/${integrationId}` : '/posts/find-slot', {
    method: 'GET',
  });
}

export function deletePostGroup(group: string) {
  return apiFetch<unknown>(`/posts/${group}`, {
    method: 'DELETE',
  });
}

export function updatePostDate(
  id: string,
  payload: { action?: 'schedule' | 'update'; date: string }
) {
  return apiFetch<unknown>(`/posts/${id}/date`, {
    method: 'PUT',
    body: JSON.stringify({
      action: payload.action ?? 'schedule',
      date: payload.date,
    }),
  });
}

export type CreatePostType = 'draft' | 'schedule' | 'now';

export type CreatePostMedia = {
  id: string;
  path: string;
  alt?: string;
  thumbnail?: string;
};

export type CreatePostValue = {
  id?: string;
  content: string;
  delay: number;
  image: CreatePostMedia[];
};

export type CreatePostEntry = {
  integration: { id: string };
  group?: string;
  settings: Record<string, unknown>;
  value: CreatePostValue[];
};

export type CreatePostRequest = {
  type: CreatePostType;
  date: string;
  shortLink: boolean;
  tags: Array<{ label: string; value: string }>;
  inter?: number;
  posts: CreatePostEntry[];
};

export type CreatePostResult = Array<{ postId: string; integration: string }>;

export type PostValidationResult = {
  id: string;
  identifier: string;
  name: string;
  valid: boolean;
  settingsError?: string;
  errors: string | true;
  emptyContent: boolean;
  tooLong: boolean;
  maximumCharacters?: number;
};

export function validatePosts(posts: CreatePostEntry[]) {
  return apiFetch<PostValidationResult[]>('/posts/valid', {
    method: 'POST',
    body: JSON.stringify({ posts }),
  });
}

export function shouldShortlink(messages: string[]) {
  return apiFetch<{ ask: boolean }>('/posts/should-shortlink', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

export function createPost(payload: CreatePostRequest, idempotencyKey: string) {
  return apiFetch<CreatePostResult>('/posts', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}
