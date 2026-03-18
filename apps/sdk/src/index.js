import { __awaiter } from "tslib";
import fetch, { FormData } from 'node-fetch';
function toQueryString(obj) {
    const params = new URLSearchParams();
    Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.append(key, String(value));
        }
    });
    return params.toString();
}
export default class Postiz {
    constructor(_apiKey, _path = 'https://api.postiz.com') {
        this._apiKey = _apiKey;
        this._path = _path;
    }
    post(posts) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield fetch(`${this._path}/public/v1/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: this._apiKey,
                },
                body: JSON.stringify(posts),
            })).json();
        });
    }
    postList(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield fetch(`${this._path}/public/v1/posts?${toQueryString(filters)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: this._apiKey,
                },
            })).json();
        });
    }
    upload(file, extension) {
        return __awaiter(this, void 0, void 0, function* () {
            const formData = new FormData();
            const type = extension === 'png'
                ? 'image/png'
                : extension === 'jpg'
                    ? 'image/jpeg'
                    : extension === 'gif'
                        ? 'image/gif'
                        : extension === 'jpeg'
                            ? 'image/jpeg'
                            : 'image/jpeg';
            const blob = new Blob([file], { type });
            formData.append('file', blob, extension);
            return (yield fetch(`${this._path}/public/v1/upload`, {
                method: 'POST',
                // @ts-ignore
                body: formData,
                headers: {
                    Authorization: this._apiKey,
                },
            })).json();
        });
    }
    integrations() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield fetch(`${this._path}/public/v1/integrations`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: this._apiKey,
                },
            })).json();
        });
    }
    deletePost(id) {
        return fetch(`${this._path}/public/v1/posts/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: this._apiKey,
            },
        });
    }
}
//# sourceMappingURL=index.js.map