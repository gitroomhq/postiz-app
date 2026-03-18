import { __awaiter, __decorate, __metadata } from "tslib";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { makeId } from "../../services/make.is";
import { GhostDto } from "../../dtos/posts/providers-settings/ghost.dto";
import slugify from 'slugify';
import { Tool } from "../tool.decorator";
import GhostAdminAPI from '@tryghost/admin-api';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as jwt from 'jsonwebtoken';
export class GhostProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'ghost';
        this.name = 'Ghost';
        this.isBetweenSteps = false;
        this.editor = 'html';
        this.scopes = [];
        this.maxConcurrentJob = 5;
        this.dto = GhostDto;
    }
    maxLength() {
        return 100000;
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            return {
                url: state,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                refreshToken: '',
                expiresIn: 0,
                accessToken: '',
                id: '',
                name: '',
                picture: '',
                username: '',
            };
        });
    }
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'domain',
                    label: 'Ghost Site URL',
                    validation: `/^https?:\\/\\/(?:www\\.)?[\\w\\-]+(\\.[\\w\\-]+)+([\\/?#][^\\s]*)?$/`,
                    type: 'text',
                },
                {
                    key: 'adminApiKey',
                    label: 'Admin API Key',
                    validation: `/^[a-f0-9]{24,26}:[a-f0-9]{64}$/`,
                    type: 'password',
                    helpText: 'Find this in Ghost Admin > Settings > Integrations > Add custom integration',
                },
                {
                    key: 'contentApiKey',
                    label: 'Content API Key (optional)',
                    validation: `/^[a-f0-9]{26}$/`,
                    type: 'password',
                    helpText: 'Optional: For reading published content via Content API',
                },
            ];
        });
    }
    parseCredentials(accessToken) {
        return JSON.parse(Buffer.from(accessToken, 'base64').toString());
    }
    createAdminAPI(credentials) {
        const url = credentials.domain.replace(/\/$/, '');
        return new GhostAdminAPI({
            url,
            key: credentials.adminApiKey,
            version: 'v6.0',
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = this.parseCredentials(params.code);
            try {
                const api = this.createAdminAPI(credentials);
                // Verify credentials by fetching site info
                const site = yield api.site.read();
                if (!site) {
                    return 'Could not retrieve site information';
                }
                return {
                    refreshToken: '',
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: params.code,
                    id: `ghost_${(site.title || 'site').toLowerCase().replace(/\s+/g, '_').substring(0, 20)}`,
                    name: site.title || 'Ghost Site',
                    picture: site.logo || site.icon || '',
                    username: new URL(credentials.domain).hostname,
                };
            }
            catch (err) {
                console.error('Ghost authentication error:', (err === null || err === void 0 ? void 0 : err.message) || err);
                return `Invalid credentials: ${(err === null || err === void 0 ? void 0 : err.message) || 'connection error'}`;
            }
        });
    }
    tags(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const credentials = this.parseCredentials(token);
                const api = this.createAdminAPI(credentials);
                const tags = yield api.tags.browse({ limit: 'all' });
                return (tags || []).map((tag) => ({
                    value: tag.name || tag.slug,
                    label: tag.name,
                }));
            }
            catch (err) {
                console.error('Ghost tags fetch error:', err);
                return [];
            }
        });
    }
    authors(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const credentials = this.parseCredentials(token);
                const api = this.createAdminAPI(credentials);
                const users = yield api.users.browse({ limit: 'all' });
                return (users || []).map((user) => ({
                    value: user.id,
                    label: user.name || user.slug,
                }));
            }
            catch (err) {
                console.error('Ghost authors fetch error:', err);
                return [];
            }
        });
    }
    tiers(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const credentials = this.parseCredentials(token);
                // Ghost Admin SDK doesn't expose tiers endpoint, but the API supports it
                // Make a direct HTTP call to /ghost/api/admin/tiers/
                const url = credentials.domain.replace(/\/$/, '');
                const authToken = this.generateAuthToken(credentials.adminApiKey);
                const response = yield fetch(`${url}/ghost/api/admin/tiers/`, {
                    headers: {
                        'Authorization': `Ghost ${authToken}`,
                        'Accept-Version': 'v6.0',
                    },
                });
                if (!response.ok) {
                    console.error('Ghost tiers fetch failed:', response.status, response.statusText);
                    return [];
                }
                const data = yield response.json();
                const tiers = data.tiers || [];
                return tiers.map((tier) => ({
                    value: tier.id,
                    label: tier.name,
                }));
            }
            catch (err) {
                console.error('Ghost tiers fetch error:', err);
                return [];
            }
        });
    }
    newsletters(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const credentials = this.parseCredentials(token);
                const api = this.createAdminAPI(credentials);
                const newsletters = yield api.newsletters.browse();
                return (newsletters || []).map((nl) => ({
                    value: nl.id,
                    label: nl.name,
                }));
            }
            catch (err) {
                console.error('Ghost newsletters fetch error:', err);
                return [];
            }
        });
    }
    themes(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const credentials = this.parseCredentials(token);
                const url = credentials.domain.replace(/\/$/, '');
                const authToken = this.generateAuthToken(credentials.adminApiKey);
                const response = yield fetch(`${url}/ghost/api/admin/themes/`, {
                    headers: {
                        'Authorization': `Ghost ${authToken}`,
                        'Accept-Version': 'v6.0',
                    },
                });
                if (!response.ok) {
                    console.error('Ghost themes fetch failed:', response.status, response.statusText);
                    return [];
                }
                const data = yield response.json();
                const themes = data.themes || [];
                return themes.map((theme) => ({
                    value: theme.name,
                    label: theme.name,
                    active: theme.active || false,
                }));
            }
            catch (err) {
                console.error('Ghost themes fetch error:', err);
                return [];
            }
        });
    }
    preview(token, postData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const credentials = this.parseCredentials(token);
                const url = credentials.domain.replace(/\/$/, '');
                const authToken = this.generateAuthToken(credentials.adminApiKey);
                // Ghost preview API creates a temporary preview post
                // The preview endpoint is POST /ghost/api/admin/posts/?source=html
                const body = {
                    posts: [{
                            title: postData.title,
                        }]
                };
                // Ghost accepts html, mobiledoc, or lexical format
                if (postData.html) {
                    body.posts[0].html = postData.html;
                }
                else if (postData.mobiledoc) {
                    body.posts[0].mobiledoc = postData.mobiledoc;
                }
                else if (postData.lexical) {
                    body.posts[0].lexical = postData.lexical;
                }
                const response = yield fetch(`${url}/ghost/api/admin/posts/?source=html&preview=true`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Ghost ${authToken}`,
                        'Content-Type': 'application/json',
                        'Accept-Version': 'v6.0',
                    },
                    body: JSON.stringify(body),
                });
                if (!response.ok) {
                    const errorText = yield response.text();
                    console.error('Ghost preview failed:', response.status, errorText);
                    return { error: `Preview failed: ${response.status}` };
                }
                const data = yield response.json();
                const post = (_a = data.posts) === null || _a === void 0 ? void 0 : _a[0];
                if (!post) {
                    return { error: 'No preview created' };
                }
                // Generate preview URL
                const previewUrl = `${url}/p/${post.uuid}/`;
                return { previewUrl };
            }
            catch (err) {
                console.error('Ghost preview error:', err);
                return { error: (err === null || err === void 0 ? void 0 : err.message) || 'Unknown error' };
            }
        });
    }
    themeSettings(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const credentials = this.parseCredentials(token);
                const url = credentials.domain.replace(/\/$/, '');
                const authToken = this.generateAuthToken(credentials.adminApiKey);
                // Fetch custom theme settings for active theme
                const response = yield fetch(`${url}/ghost/api/admin/custom_theme_settings/`, {
                    headers: {
                        'Authorization': `Ghost ${authToken}`,
                        'Accept-Version': 'v6.0',
                    },
                });
                if (!response.ok) {
                    console.error('Ghost theme settings fetch failed:', response.status, response.statusText);
                    return [];
                }
                const data = yield response.json();
                return (data.custom_theme_settings || []).map((setting) => ({
                    key: setting.key,
                    type: setting.type,
                    value: setting.value,
                    options: setting.options,
                    default: setting.default,
                    group: setting.group,
                    description: setting.description,
                }));
            }
            catch (err) {
                console.error('Ghost theme settings fetch error:', err);
                return [];
            }
        });
    }
    updateThemeSettings(token, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const credentials = this.parseCredentials(token);
                const url = credentials.domain.replace(/\/$/, '');
                const authToken = this.generateAuthToken(credentials.adminApiKey);
                const response = yield fetch(`${url}/ghost/api/admin/custom_theme_settings/`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Ghost ${authToken}`,
                        'Content-Type': 'application/json',
                        'Accept-Version': 'v6.0',
                    },
                    body: JSON.stringify({
                        custom_theme_settings: settings,
                    }),
                });
                if (!response.ok) {
                    const errorText = yield response.text();
                    console.error('Ghost theme settings update failed:', response.status, errorText);
                    return { success: false, error: `Update failed: ${response.status}` };
                }
                const data = yield response.json();
                return {
                    success: true,
                    settings: data.custom_theme_settings,
                };
            }
            catch (err) {
                console.error('Ghost theme settings update error:', err);
                return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'Unknown error' };
            }
        });
    }
    activateTheme(token, themeName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const credentials = this.parseCredentials(token);
                const url = credentials.domain.replace(/\/$/, '');
                const authToken = this.generateAuthToken(credentials.adminApiKey);
                const response = yield fetch(`${url}/ghost/api/admin/themes/activate/?name=${encodeURIComponent(themeName)}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Ghost ${authToken}`,
                        'Accept-Version': 'v6.0',
                    },
                });
                if (!response.ok) {
                    const errorText = yield response.text();
                    console.error('Ghost theme activation failed:', response.status, errorText);
                    return { success: false, error: `Activation failed: ${response.status}` };
                }
                const data = yield response.json();
                return {
                    success: true,
                    theme: (_a = data.themes) === null || _a === void 0 ? void 0 : _a[0],
                };
            }
            catch (err) {
                console.error('Ghost theme activation error:', err);
                return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'Unknown error' };
            }
        });
    }
    /**
     * Parse a Ghost theme ZIP file to extract theme metadata and custom settings.
     * This is used to preview theme settings before uploading to Ghost.
     *
     * @param zipUrl - URL to the theme ZIP file
     * @returns Theme metadata including name, version, and custom settings
     */
    parseThemeZip(zipUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Download the ZIP file
                const response = yield fetch(zipUrl);
                if (!response.ok) {
                    return { success: false, error: `Failed to download theme: ${response.status}` };
                }
                const arrayBuffer = yield response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // Use ADM-ZIP or similar to extract package.json
                // For now, we'll use Node's built-in zlib and a simple extraction
                const packageJson = yield this.extractPackageJsonFromZip(buffer);
                if (!packageJson) {
                    return { success: false, error: 'Could not find package.json in theme ZIP' };
                }
                const parsed = JSON.parse(packageJson);
                return {
                    success: true,
                    theme: {
                        name: parsed.name,
                        version: parsed.version,
                        description: parsed.description,
                        author: parsed.author,
                        customSettings: ((_a = parsed.config) === null || _a === void 0 ? void 0 : _a.customSettings) || {},
                    },
                };
            }
            catch (err) {
                console.error('Theme ZIP parse error:', err);
                return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'Unknown error' };
            }
        });
    }
    /**
     * Upload a theme ZIP file to Ghost.
     *
     * @param token - Access token
     * @param zipUrl - URL to download the theme ZIP from
     * @returns Uploaded theme info
     */
    uploadTheme(token, zipUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const credentials = this.parseCredentials(token);
                const url = credentials.domain.replace(/\/$/, '');
                const authToken = this.generateAuthToken(credentials.adminApiKey);
                // Download the ZIP file
                const response = yield fetch(zipUrl);
                if (!response.ok) {
                    return { success: false, error: `Failed to download theme: ${response.status}` };
                }
                const arrayBuffer = yield response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // Extract filename from URL
                const urlPath = new URL(zipUrl).pathname;
                const filename = path.basename(urlPath) || `theme-${Date.now()}.zip`;
                // Write to temp file
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-theme-'));
                const tmpPath = path.join(tmpDir, filename);
                try {
                    fs.writeFileSync(tmpPath, buffer);
                    // Use FormData to upload
                    const formData = new FormData();
                    formData.append('theme', new Blob([buffer]), filename);
                    const uploadResponse = yield fetch(`${url}/ghost/api/admin/themes/upload/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Ghost ${authToken}`,
                            'Accept-Version': 'v6.0',
                        },
                        body: formData,
                    });
                    if (!uploadResponse.ok) {
                        const errorText = yield uploadResponse.text();
                        console.error('Theme upload failed:', uploadResponse.status, errorText);
                        return { success: false, error: `Upload failed: ${uploadResponse.status}` };
                    }
                    const data = yield uploadResponse.json();
                    const theme = (_a = data.themes) === null || _a === void 0 ? void 0 : _a[0];
                    return {
                        success: true,
                        theme: {
                            name: theme === null || theme === void 0 ? void 0 : theme.name,
                            active: theme === null || theme === void 0 ? void 0 : theme.active,
                        },
                    };
                }
                finally {
                    // Cleanup temp directory
                    fs.rmSync(tmpDir, { recursive: true, force: true });
                }
            }
            catch (err) {
                console.error('Theme upload error:', err);
                return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'Unknown error' };
            }
        });
    }
    /**
     * Extract package.json from a ZIP buffer.
     * Ghost themes have package.json at the root or in a subdirectory.
     */
    extractPackageJsonFromZip(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Use dynamic import for adm-zip (ESM compatible)
                const AdmZip = (yield import('adm-zip')).default;
                const zip = new AdmZip(buffer);
                // Try root level first
                let entry = zip.getEntry('package.json');
                // If not at root, search in subdirectories (common for GitHub releases)
                if (!entry) {
                    const entries = zip.getEntries();
                    for (const e of entries) {
                        if (e.entryName.endsWith('package.json') && e.entryName.split('/').length === 2) {
                            entry = e;
                            break;
                        }
                    }
                }
                if (!entry) {
                    return null;
                }
                return entry.getData().toString('utf8');
            }
            catch (err) {
                // Fallback: manually parse with unzip
                console.error('ADM-ZIP extraction failed, trying manual extraction:', err);
                return this.extractPackageJsonManually(buffer);
            }
        });
    }
    /**
     * Manual ZIP extraction fallback using Node's built-in zlib.
     */
    extractPackageJsonManually(buffer) {
        // This is a simplified extraction - for full ZIP support, adm-zip is preferred
        // ZIP files have a central directory at the end
        try {
            // Find the end of central directory signature
            const eocdOffset = buffer.indexOf(Buffer.from([0x06, 0x05, 0x4b, 0x50]));
            if (eocdOffset === -1) {
                return null;
            }
            // For now, return null and let adm-zip handle it
            // Full ZIP parsing is complex - better to require the adm-zip dependency
            return null;
        }
        catch (_a) {
            return null;
        }
    }
    /**
     * Generate JWT token from Admin API Key for direct API calls
     * The Ghost Admin SDK does this internally, but we need it for endpoints not in the SDK
     */
    generateAuthToken(adminApiKey) {
        const [id, secret] = adminApiKey.split(':');
        if (!id || !secret) {
            throw new Error('Invalid Admin API Key format');
        }
        // Create JWT token matching Ghost Admin API format
        // Audience is /admin/ for admin API calls
        return jwt.sign({}, Buffer.from(secret, 'hex'), {
            keyid: id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/admin/'
        });
    }
    uploadImage(api, imageUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch image from URL
                const response = yield fetch(imageUrl);
                if (!response.ok) {
                    console.error('Failed to fetch image:', imageUrl);
                    return null;
                }
                const blob = yield response.blob();
                const buffer = Buffer.from(yield blob.arrayBuffer());
                // Extract filename from URL or generate one
                const urlPath = new URL(imageUrl).pathname;
                const filename = path.basename(urlPath) || `image-${Date.now()}.jpg`;
                // Write to temp file - Ghost SDK expects a file path, not a Buffer
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-upload-'));
                const tmpPath = path.join(tmpDir, filename);
                try {
                    fs.writeFileSync(tmpPath, buffer);
                    // Upload via Ghost Admin API using file path
                    const result = yield api.images.upload({
                        file: tmpPath,
                        filename,
                        purpose: 'image',
                    });
                    return (result === null || result === void 0 ? void 0 : result.url) || null;
                }
                finally {
                    // Cleanup temp directory
                    fs.rmSync(tmpDir, { recursive: true, force: true });
                }
            }
            catch (err) {
                console.error('Ghost image upload error:', err);
                return null;
            }
        });
    }
    /**
     * Process inline images in HTML content by rehosting them to Ghost's image storage.
     * Ghost does NOT automatically rehost external images - they stay as external URLs
     * which can break if the source becomes unavailable.
     */
    processInlineImages(api, html) {
        return __awaiter(this, void 0, void 0, function* () {
            const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
            const uploads = new Map();
            // Find all image URLs
            let match;
            while ((match = imgRegex.exec(html)) !== null) {
                const url = match[1];
                // Only process external URLs (not already Ghost-hosted)
                if (!url.includes('/content/images/') && !uploads.has(url)) {
                    uploads.set(url, this.uploadImage(api, url));
                }
            }
            // Wait for all uploads to complete
            const urlMappings = new Map();
            for (const [oldUrl, uploadPromise] of uploads) {
                const newUrl = yield uploadPromise;
                if (newUrl) {
                    urlMappings.set(oldUrl, newUrl);
                }
            }
            // Replace URLs in HTML
            let processedHtml = html;
            for (const [oldUrl, newUrl] of urlMappings) {
                // Replace all occurrences of this URL
                processedHtml = processedHtml.split(oldUrl).join(newUrl);
            }
            return processedHtml;
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const credentials = this.parseCredentials(accessToken);
            const api = this.createAdminAPI(credentials);
            const firstPost = postDetails[0];
            const settings = firstPost.settings;
            // Handle feature image upload if provided
            let featureImageUrl;
            if ((_a = settings === null || settings === void 0 ? void 0 : settings.feature_image) === null || _a === void 0 ? void 0 : _a.path) {
                const uploadedUrl = yield this.uploadImage(api, settings.feature_image.path);
                if (uploadedUrl) {
                    featureImageUrl = uploadedUrl;
                }
            }
            // Process inline images - rehost external images to Ghost's storage
            // Ghost does NOT auto-rehost external images, so we handle it here
            const processedHtml = yield this.processInlineImages(api, firstPost.message);
            // Extract title from first line of message if not provided in settings
            const messageLines = firstPost.message.split('\n').filter((l) => l.trim());
            const extractedTitle = ((_b = messageLines[0]) === null || _b === void 0 ? void 0 : _b.replace(/<[^>]*>/g, '').trim()) || 'Untitled';
            const postTitle = (settings === null || settings === void 0 ? void 0 : settings.title) || extractedTitle;
            // Generate slug
            const postSlug = (settings === null || settings === void 0 ? void 0 : settings.slug)
                ? slugify(settings.slug, { lower: true, strict: true, trim: true })
                : slugify(postTitle, {
                    lower: true,
                    strict: true,
                    trim: true,
                });
            // Build post data using Ghost SDK format
            const postData = {
                title: postTitle,
                html: processedHtml, // Use processed HTML with rehosted images
                slug: postSlug,
                status: (settings === null || settings === void 0 ? void 0 : settings.status) || 'published',
            };
            // Feature image
            if (featureImageUrl) {
                postData.feature_image = featureImageUrl;
            }
            // Feature image metadata
            if (settings === null || settings === void 0 ? void 0 : settings.feature_image_caption) {
                postData.feature_image_caption = settings.feature_image_caption;
            }
            if (settings === null || settings === void 0 ? void 0 : settings.feature_image_alt) {
                postData.feature_image_alt = settings.feature_image_alt;
            }
            // Custom excerpt
            if (settings === null || settings === void 0 ? void 0 : settings.custom_excerpt) {
                postData.custom_excerpt = settings.custom_excerpt;
            }
            // Visibility (public, members, paid)
            if (settings === null || settings === void 0 ? void 0 : settings.visibility) {
                postData.visibility = settings.visibility;
            }
            // Tiers for paid content (if visibility is 'paid')
            if ((settings === null || settings === void 0 ? void 0 : settings.tiers) && settings.tiers.length > 0) {
                postData.tiers = settings.tiers.map((tierId) => ({ id: tierId }));
            }
            // Newsletter
            if (settings === null || settings === void 0 ? void 0 : settings.newsletter_id) {
                postData.newsletter = { id: settings.newsletter_id };
            }
            // Email settings
            if (settings === null || settings === void 0 ? void 0 : settings.email_subject) {
                postData.email_subject = settings.email_subject;
            }
            // SEO/Meta fields
            if (settings === null || settings === void 0 ? void 0 : settings.meta_title) {
                postData.meta_title = settings.meta_title;
            }
            if (settings === null || settings === void 0 ? void 0 : settings.meta_description) {
                postData.meta_description = settings.meta_description;
            }
            // Open Graph
            if (settings === null || settings === void 0 ? void 0 : settings.og_title) {
                postData.og_title = settings.og_title;
            }
            if (settings === null || settings === void 0 ? void 0 : settings.og_description) {
                postData.og_description = settings.og_description;
            }
            if (settings === null || settings === void 0 ? void 0 : settings.og_image) {
                postData.og_image = settings.og_image;
            }
            // Twitter
            if (settings === null || settings === void 0 ? void 0 : settings.twitter_title) {
                postData.twitter_title = settings.twitter_title;
            }
            if (settings === null || settings === void 0 ? void 0 : settings.twitter_description) {
                postData.twitter_description = settings.twitter_description;
            }
            if (settings === null || settings === void 0 ? void 0 : settings.twitter_image) {
                postData.twitter_image = settings.twitter_image;
            }
            // Canonical URL
            if (settings === null || settings === void 0 ? void 0 : settings.canonical_url) {
                postData.canonical_url = settings.canonical_url;
            }
            // Scheduled publishing - use Ghost's native scheduling
            // Priority: 1) settings.published_at, 2) postDetails.publishDate from Postiz
            // Ghost expects ISO 8601 format for published_at
            const scheduledDate = (settings === null || settings === void 0 ? void 0 : settings.published_at)
                ? new Date(settings.published_at)
                : firstPost.publishDate
                    ? new Date(firstPost.publishDate)
                    : null;
            if (scheduledDate) {
                postData.published_at = scheduledDate.toISOString();
                // Use 'scheduled' status if publishing in the future
                if (scheduledDate > new Date() && (settings === null || settings === void 0 ? void 0 : settings.status) !== 'draft') {
                    postData.status = 'scheduled';
                }
            }
            // Tags (can be array of names or objects with name property)
            if ((settings === null || settings === void 0 ? void 0 : settings.tags) && settings.tags.length > 0) {
                postData.tags = settings.tags.map((tag) => ({ name: tag }));
            }
            // Authors (array of author IDs)
            if ((settings === null || settings === void 0 ? void 0 : settings.authors) && settings.authors.length > 0) {
                postData.authors = settings.authors.map((id) => ({ id }));
            }
            try {
                // Use Ghost Admin API to create post
                // IMPORTANT: source: 'html' tells Ghost to convert HTML to Lexical/Mobiledoc format
                const createdPost = yield api.posts.add(postData, {
                    source: 'html',
                    include: 'tags,authors'
                });
                if (!createdPost) {
                    throw new Error('Failed to create Ghost post - no response');
                }
                return [
                    {
                        id: firstPost.id,
                        status: 'completed',
                        postId: String(createdPost.id),
                        releaseURL: createdPost.url || `${credentials.domain}/${postSlug}/`,
                    },
                ];
            }
            catch (err) {
                console.error('Ghost post creation error:', (err === null || err === void 0 ? void 0 : err.message) || err);
                throw new Error(`Failed to create Ghost post: ${(err === null || err === void 0 ? void 0 : err.message) || 'unknown error'}`);
            }
        });
    }
    /**
     * Update an existing Ghost post
     * Used for editing scheduled/draft posts or changing post status
     */
    update(id, accessToken, ghostPostId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = this.parseCredentials(accessToken);
            const api = this.createAdminAPI(credentials);
            const updateData = { id: ghostPostId };
            // Apply updates
            if (updates.title !== undefined)
                updateData.title = updates.title;
            if (updates.html !== undefined)
                updateData.html = updates.html;
            if (updates.status !== undefined)
                updateData.status = updates.status;
            if (updates.published_at !== undefined) {
                updateData.published_at = updates.published_at;
                // Auto-set status to 'scheduled' if published_at is in the future
                const publishDate = new Date(updates.published_at);
                if (publishDate > new Date() && updates.status !== 'draft') {
                    updateData.status = 'scheduled';
                }
            }
            if (updates.feature_image !== undefined)
                updateData.feature_image = updates.feature_image;
            if (updates.visibility !== undefined)
                updateData.visibility = updates.visibility;
            if (updates.tags !== undefined) {
                updateData.tags = updates.tags.map((tag) => ({ name: tag }));
            }
            if (updates.authors !== undefined) {
                updateData.authors = updates.authors.map((authorId) => ({ id: authorId }));
            }
            // Copy any additional fields
            for (const [key, value] of Object.entries(updates)) {
                if (!['title', 'html', 'status', 'published_at', 'feature_image', 'visibility', 'tags', 'authors'].includes(key)) {
                    updateData[key] = value;
                }
            }
            try {
                // Ghost requires updated_at for optimistic concurrency control
                // Fetch current post to get its updated_at timestamp
                const currentPost = yield api.posts.read({ id: ghostPostId }, { include: 'tags,authors' });
                if (!currentPost) {
                    throw new Error('Post not found');
                }
                updateData.updated_at = currentPost.updated_at;
                const updatedPost = yield api.posts.edit(updateData, {
                    source: 'html',
                    include: 'tags,authors'
                });
                if (!updatedPost) {
                    throw new Error('Failed to update Ghost post - no response');
                }
                return {
                    id,
                    postId: String(updatedPost.id),
                    releaseURL: updatedPost.url || '',
                    status: updatedPost.status || 'updated',
                };
            }
            catch (err) {
                console.error('Ghost post update error:', (err === null || err === void 0 ? void 0 : err.message) || err);
                throw new Error(`Failed to update Ghost post: ${(err === null || err === void 0 ? void 0 : err.message) || 'unknown error'}`);
            }
        });
    }
    /**
     * Delete a Ghost post
     * Used for canceling scheduled posts or removing drafts
     */
    delete(accessToken, ghostPostId, internalId, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = this.parseCredentials(accessToken);
            const api = this.createAdminAPI(credentials);
            try {
                yield api.posts.delete({ id: ghostPostId });
                return { id: internalId || '', success: true };
            }
            catch (err) {
                console.error('Ghost post deletion error:', (err === null || err === void 0 ? void 0 : err.message) || err);
                throw new Error(`Failed to delete Ghost post: ${(err === null || err === void 0 ? void 0 : err.message) || 'unknown error'}`);
            }
        });
    }
    /**
     * Get the status of a Ghost post
     * Returns: draft, published, scheduled, or sent (for email newsletters)
     */
    getStatus(accessToken, ghostPostId, internalId, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = this.parseCredentials(accessToken);
            const api = this.createAdminAPI(credentials);
            try {
                const post = yield api.posts.read({ id: ghostPostId }, { include: 'tags,authors' });
                if (!post) {
                    throw new Error('Post not found');
                }
                return {
                    id: String(post.id),
                    status: post.status,
                    publishedAt: post.published_at,
                    url: post.url,
                    title: post.title,
                };
            }
            catch (err) {
                console.error('Ghost post status error:', (err === null || err === void 0 ? void 0 : err.message) || err);
                throw new Error(`Failed to get Ghost post status: ${(err === null || err === void 0 ? void 0 : err.message) || 'unknown error'}`);
            }
        });
    }
    /**
     * Change a post's status
     * - draft → published (publish now)
     * - scheduled → draft (cancel schedule)
     * - published → draft (unpublish)
     * - any status → scheduled (with published_at)
     */
    changeStatus(accessToken, ghostPostId, newStatus, publishedAt, internalId, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = this.parseCredentials(accessToken);
            const api = this.createAdminAPI(credentials);
            const updateData = {
                id: ghostPostId,
                status: newStatus,
            };
            // For scheduled posts, include published_at
            if (newStatus === 'scheduled' && publishedAt) {
                updateData.published_at = publishedAt;
            }
            // For published status, clear published_at if not provided (publish now)
            if (newStatus === 'published') {
                updateData.published_at = publishedAt || new Date().toISOString();
            }
            try {
                // Ghost requires updated_at for optimistic concurrency control
                // Fetch current post to get its updated_at timestamp
                const currentPost = yield api.posts.read({ id: ghostPostId });
                if (!currentPost) {
                    throw new Error('Post not found');
                }
                updateData.updated_at = currentPost.updated_at;
                const updatedPost = yield api.posts.edit(updateData, {
                    include: 'tags,authors'
                });
                if (!updatedPost) {
                    throw new Error('Failed to change Ghost post status - no response');
                }
                return {
                    id: internalId || '',
                    postId: String(updatedPost.id),
                    releaseURL: updatedPost.url || '',
                    status: updatedPost.status,
                };
            }
            catch (err) {
                console.error('Ghost post status change error:', (err === null || err === void 0 ? void 0 : err.message) || err);
                throw new Error(`Failed to change Ghost post status: ${(err === null || err === void 0 ? void 0 : err.message) || 'unknown error'}`);
            }
        });
    }
}
__decorate([
    Tool({ description: 'Get Ghost tags', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "tags", null);
__decorate([
    Tool({ description: 'Get Ghost authors', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "authors", null);
__decorate([
    Tool({ description: 'Get Ghost tiers (for paid content)', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "tiers", null);
__decorate([
    Tool({ description: 'Get Ghost newsletters', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "newsletters", null);
__decorate([
    Tool({ description: 'Get Ghost themes', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "themes", null);
__decorate([
    Tool({ description: 'Preview a Ghost post', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "preview", null);
__decorate([
    Tool({ description: 'Get custom theme settings for the active theme (variants like colors, typography, layouts)', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "themeSettings", null);
__decorate([
    Tool({ description: 'Update custom theme settings for the active theme', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "updateThemeSettings", null);
__decorate([
    Tool({ description: 'Activate a Ghost theme', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "activateTheme", null);
__decorate([
    Tool({ description: 'Parse a Ghost theme ZIP file to extract metadata and custom settings', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "parseThemeZip", null);
__decorate([
    Tool({ description: 'Upload a Ghost theme ZIP file', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GhostProvider.prototype, "uploadTheme", null);
//# sourceMappingURL=ghost.provider.js.map