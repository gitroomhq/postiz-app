// Key mappings for minifying post list/calendar responses to reduce payload size.
// Both backend (minify) and frontend (expand) import from here.
const POST_LIST_KEYS = {
    posts: 'p',
    total: 't',
    page: 'pg',
    limit: 'l',
    hasMore: 'hm',
};
const POST_CALENDAR_KEYS = {
    posts: 'p',
};
const POST_ITEM_KEYS = {
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
const INTEGRATION_KEYS = {
    id: 'i',
    providerIdentifier: 'pi',
    name: 'n',
    picture: 'p',
};
const TAG_KEYS = {
    tag: 't',
};
const TAG_INNER_KEYS = {
    id: 'i',
    name: 'n',
    color: 'c',
    orgId: 'o',
    createdAt: 'ca',
    updatedAt: 'ua',
    deletedAt: 'da',
};
function mapKeys(obj, keyMap) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[keyMap[key] || key] = value;
    }
    return result;
}
function reverseMap(keyMap) {
    const reversed = {};
    for (const [key, value] of Object.entries(keyMap)) {
        reversed[value] = key;
    }
    return reversed;
}
function minifyPostItem(post) {
    var _a;
    return mapKeys(Object.assign(Object.assign({}, post), { integration: post.integration
            ? mapKeys(post.integration, INTEGRATION_KEYS)
            : post.integration, tags: (_a = post.tags) === null || _a === void 0 ? void 0 : _a.map((tagWrapper) => mapKeys(Object.assign(Object.assign({}, tagWrapper), { tag: tagWrapper.tag
                ? mapKeys(tagWrapper.tag, TAG_INNER_KEYS)
                : tagWrapper.tag }), TAG_KEYS)) }), POST_ITEM_KEYS);
}
function expandPostItem(post) {
    const postReversed = reverseMap(POST_ITEM_KEYS);
    const integrationReversed = reverseMap(INTEGRATION_KEYS);
    const tagReversed = reverseMap(TAG_KEYS);
    const tagInnerReversed = reverseMap(TAG_INNER_KEYS);
    const expandedPost = mapKeys(post, postReversed);
    if (expandedPost.integration) {
        expandedPost.integration = mapKeys(expandedPost.integration, integrationReversed);
    }
    if (expandedPost.tags) {
        expandedPost.tags = expandedPost.tags.map((tagWrapper) => {
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
export function minifyPostsList(data) {
    return mapKeys(Object.assign(Object.assign({}, data), { posts: data.posts.map(minifyPostItem) }), POST_LIST_KEYS);
}
export function expandPostsList(data) {
    const topReversed = reverseMap(POST_LIST_KEYS);
    const expanded = mapKeys(data, topReversed);
    expanded.posts = (expanded.posts || []).map(expandPostItem);
    return expanded;
}
// --- getPosts (calendar view) ---
export function minifyPosts(data) {
    return mapKeys(Object.assign(Object.assign({}, data), { posts: data.posts.map(minifyPostItem) }), POST_CALENDAR_KEYS);
}
export function expandPosts(data) {
    const topReversed = reverseMap(POST_CALENDAR_KEYS);
    const expanded = mapKeys(data, topReversed);
    expanded.posts = (expanded.posts || []).map(expandPostItem);
    return expanded;
}
//# sourceMappingURL=posts.list.minify.js.map