// Key mappings for minifying post list/calendar responses to reduce payload size.
// Both backend (minify) and frontend (expand) import from here.

const POST_LIST_KEYS: Record<string, string> = {
  posts: 'p',
  total: 't',
  page: 'pg',
  limit: 'l',
  hasMore: 'hm',
};

const POST_CALENDAR_KEYS: Record<string, string> = {
  posts: 'p',
};

const POST_ITEM_KEYS: Record<string, string> = {
  id: 'i',
  content: 'c',
  publishDate: 'd',
  releaseURL: 'u',
  releaseId: 'ri',
  state: 's',
  group: 'g',
  tags: 'tg',
  integration: 'n',
  intervalInDays: 'iv',
  actualDate: 'ad',
};

const INTEGRATION_KEYS: Record<string, string> = {
  id: 'i',
  providerIdentifier: 'pi',
  name: 'n',
  picture: 'p',
};

const TAG_KEYS: Record<string, string> = {
  tag: 't',
};

const TAG_INNER_KEYS: Record<string, string> = {
  id: 'i',
  name: 'n',
  color: 'c',
  orgId: 'o',
  createdAt: 'ca',
  updatedAt: 'ua',
  deletedAt: 'da',
};

function mapKeys(obj: Record<string, any>, keyMap: Record<string, string>) {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[keyMap[key] || key] = value;
  }
  return result;
}

function reverseMap(keyMap: Record<string, string>) {
  const reversed: Record<string, string> = {};
  for (const [key, value] of Object.entries(keyMap)) {
    reversed[value] = key;
  }
  return reversed;
}

function minifyPostItem(post: any) {
  return mapKeys(
    {
      ...post,
      integration: post.integration
        ? mapKeys(post.integration, INTEGRATION_KEYS)
        : post.integration,
      tags: post.tags?.map((tagWrapper: any) =>
        mapKeys(
          {
            ...tagWrapper,
            tag: tagWrapper.tag
              ? mapKeys(tagWrapper.tag, TAG_INNER_KEYS)
              : tagWrapper.tag,
          },
          TAG_KEYS
        )
      ),
    },
    POST_ITEM_KEYS
  );
}

function expandPostItem(post: any) {
  const postReversed = reverseMap(POST_ITEM_KEYS);
  const integrationReversed = reverseMap(INTEGRATION_KEYS);
  const tagReversed = reverseMap(TAG_KEYS);
  const tagInnerReversed = reverseMap(TAG_INNER_KEYS);

  const expandedPost = mapKeys(post, postReversed);
  if (expandedPost.integration) {
    expandedPost.integration = mapKeys(
      expandedPost.integration,
      integrationReversed
    );
  }
  if (expandedPost.tags) {
    expandedPost.tags = expandedPost.tags.map((tagWrapper: any) => {
      const expandedWrapper = mapKeys(tagWrapper, tagReversed);
      if (expandedWrapper.tag) {
        expandedWrapper.tag = mapKeys(expandedWrapper.tag, tagInnerReversed);
      }
      return expandedWrapper;
    });
  }
  return expandedPost;
}

// --- getPostsList (paginated list view) ---

export function minifyPostsList(data: {
  posts: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}) {
  return mapKeys(
    {
      ...data,
      posts: data.posts.map(minifyPostItem),
    },
    POST_LIST_KEYS
  );
}

export function expandPostsList(data: any) {
  const topReversed = reverseMap(POST_LIST_KEYS);
  const expanded = mapKeys(data, topReversed);
  expanded.posts = (expanded.posts || []).map(expandPostItem);
  return expanded;
}

// --- getPosts (calendar view) ---

export function minifyPosts(data: { posts: any[] }) {
  return mapKeys(
    {
      ...data,
      posts: data.posts.map(minifyPostItem),
    },
    POST_CALENDAR_KEYS
  );
}

export function expandPosts(data: any) {
  const topReversed = reverseMap(POST_CALENDAR_KEYS);
  const expanded = mapKeys(data, topReversed);
  expanded.posts = (expanded.posts || []).map(expandPostItem);
  return expanded;
}
