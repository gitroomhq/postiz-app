import { __awaiter } from "tslib";
import { timer } from "../../../helpers/src/utils/timer";
import { ApplicationFailure } from '@temporalio/activity';
export class RefreshToken extends ApplicationFailure {
    constructor(identifier, json, body, message = '') {
        super(message, 'refresh_token', true, [
            {
                identifier,
                json,
                body,
            },
        ]);
    }
}
export class BadBody extends ApplicationFailure {
    constructor(identifier, json, body, message = '') {
        super(message, 'bad_body', true, [
            {
                identifier,
                json,
                body,
            },
        ]);
    }
}
export class NotEnoughScopes {
    constructor(message = 'Not enough scopes, when choosing a provider, please add all the scopes') {
        this.message = message;
    }
}
function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    });
}
export class SocialAbstract {
    constructor() {
        this.maxConcurrentJob = 1;
    }
    handleErrors(body) {
        return undefined;
    }
    mention(token, d, id, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            return { none: true };
        });
    }
    runInConcurrent(func, ignoreConcurrency) {
        return __awaiter(this, void 0, void 0, function* () {
            let value;
            try {
                value = yield func();
            }
            catch (err) {
                const handle = this.handleErrors(safeStringify(err));
                value = Object.assign({ err: true, value: 'Unknown Error' }, (handle || {}));
            }
            if (value && (value === null || value === void 0 ? void 0 : value.err) && (value === null || value === void 0 ? void 0 : value.value)) {
                if (value.type === 'refresh-token') {
                    throw new RefreshToken('', safeStringify({}), {}, value.value || '');
                }
                throw new BadBody('', safeStringify({}), {}, value.value || '');
            }
            return value;
        });
    }
    fetch(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, options = {}, identifier = '', totalRetries = 0, ignoreConcurrency = false) {
            const request = yield fetch(url, options);
            if (request.status === 200 || request.status === 201) {
                return request;
            }
            if (totalRetries > 2) {
                throw new BadBody(identifier, '{}', options.body || '{}');
            }
            let json = '{}';
            try {
                json = yield request.text();
            }
            catch (err) {
                json = '{}';
            }
            const handleError = this.handleErrors(json || '{}');
            if (request.status === 429 ||
                (request.status === 500 && !handleError) ||
                json.includes('rate_limit_exceeded') ||
                json.includes('Rate limit')) {
                yield timer(5000);
                return this.fetch(url, options, identifier, totalRetries + 1, ignoreConcurrency);
            }
            if ((handleError === null || handleError === void 0 ? void 0 : handleError.type) === 'retry') {
                yield timer(5000);
                return this.fetch(url, options, identifier, totalRetries + 1, ignoreConcurrency);
            }
            if ((request.status === 401 &&
                ((handleError === null || handleError === void 0 ? void 0 : handleError.type) === 'refresh-token' || !handleError)) ||
                (handleError === null || handleError === void 0 ? void 0 : handleError.type) === 'refresh-token') {
                throw new RefreshToken(identifier, json, options.body, handleError === null || handleError === void 0 ? void 0 : handleError.value);
            }
            throw new BadBody(identifier, json, options.body, (handleError === null || handleError === void 0 ? void 0 : handleError.value) || '');
        });
    }
    checkScopes(required, got) {
        if (Array.isArray(got)) {
            if (!required.every((scope) => got.includes(scope))) {
                throw new NotEnoughScopes();
            }
            return true;
        }
        const newGot = decodeURIComponent(got);
        const splitType = newGot.indexOf(',') > -1 ? ',' : ' ';
        const gotArray = newGot.split(splitType);
        if (!required.every((scope) => gotArray.includes(scope))) {
            throw new NotEnoughScopes();
        }
        return true;
    }
}
//# sourceMappingURL=social.abstract.js.map