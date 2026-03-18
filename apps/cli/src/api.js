import { __awaiter } from "tslib";
import fetch, { FormData } from 'node-fetch';
export class PostizAPI {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiUrl = config.apiUrl || 'https://api.postiz.com';
    }
    request(endpoint_1) {
        return __awaiter(this, arguments, void 0, function* (endpoint, options = {}) {
            const url = `${this.apiUrl}${endpoint}`;
            const headers = Object.assign({ 'Content-Type': 'application/json', Authorization: this.apiKey }, options.headers);
            try {
                const response = yield fetch(url, Object.assign(Object.assign({}, options), { headers }));
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`API Error (${response.status}): ${error}`);
                }
                return yield response.json();
            }
            catch (error) {
                throw new Error(`Request failed: ${error.message}`);
            }
        });
    }
    createPost(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request('/public/v1/posts', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        });
    }
    listPosts() {
        return __awaiter(this, arguments, void 0, function* (filters = {}) {
            const queryString = new URLSearchParams(Object.entries(filters).reduce((acc, [key, value]) => {
                if (value !== undefined && value !== null) {
                    acc[key] = String(value);
                }
                return acc;
            }, {})).toString();
            const endpoint = queryString
                ? `/public/v1/posts?${queryString}`
                : '/public/v1/posts';
            return this.request(endpoint, {
                method: 'GET',
            });
        });
    }
    deletePost(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(`/public/v1/posts/${id}`, {
                method: 'DELETE',
            });
        });
    }
    upload(file, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const formData = new FormData();
            const extension = ((_a = filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
            // Determine MIME type based on file extension
            const mimeTypes = {
                // Images
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
                'bmp': 'image/bmp',
                'ico': 'image/x-icon',
                // Videos
                'mp4': 'video/mp4',
                'mov': 'video/quicktime',
                'avi': 'video/x-msvideo',
                'mkv': 'video/x-matroska',
                'webm': 'video/webm',
                'flv': 'video/x-flv',
                'wmv': 'video/x-ms-wmv',
                'm4v': 'video/x-m4v',
                'mpeg': 'video/mpeg',
                'mpg': 'video/mpeg',
                '3gp': 'video/3gpp',
                // Audio
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'aac': 'audio/aac',
                'flac': 'audio/flac',
                'm4a': 'audio/mp4',
                // Documents
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            };
            const type = mimeTypes[extension] || 'application/octet-stream';
            const blob = new Blob([file], { type });
            formData.append('file', blob, filename);
            const url = `${this.apiUrl}/public/v1/upload`;
            const response = yield fetch(url, {
                method: 'POST',
                // @ts-ignore
                body: formData,
                headers: {
                    Authorization: this.apiKey,
                },
            });
            if (!response.ok) {
                const error = yield response.text();
                throw new Error(`Upload failed (${response.status}): ${error}`);
            }
            return yield response.json();
        });
    }
    listIntegrations() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request('/public/v1/integrations', {
                method: 'GET',
            });
        });
    }
    getIntegrationSettings(integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(`/public/v1/integration-settings/${integrationId}`, {
                method: 'GET',
            });
        });
    }
    triggerIntegrationTool(integrationId, methodName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(`/public/v1/integration-trigger/${integrationId}`, {
                method: 'POST',
                body: JSON.stringify({ methodName, data }),
            });
        });
    }
}
//# sourceMappingURL=api.js.map