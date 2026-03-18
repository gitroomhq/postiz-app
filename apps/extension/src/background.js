import { __awaiter } from "tslib";
import { getAllProviders, getProvider } from './providers/provider.registry';
const EXTENSION_VERSION = '2.0.0';
const REFRESH_ALARM_NAME = 'cookie-refresh';
const STORAGE_KEY = 'refreshEntries';
const ALLOWED_ORIGIN_PATTERNS = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/([a-z0-9-]+\.)*postiz\.com$/,
];
function isOriginAllowed(origin) {
    if (!origin)
        return false;
    return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}
function extractCookies(provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const allCookies = yield chrome.cookies.getAll({ url: provider.url });
        const extracted = {};
        const missingRequired = [];
        for (const def of provider.cookies) {
            const found = allCookies.find((c) => c.name === def.name);
            if (found) {
                extracted[def.name] = found.value;
            }
            else if (def.required) {
                missingRequired.push(def.name);
            }
        }
        if (missingRequired.length > 0) {
            return {
                success: false,
                provider: provider.identifier,
                error: `Missing required cookies: ${missingRequired.join(', ')}. User may need to log in to ${provider.name}.`,
                missingCookies: missingRequired,
            };
        }
        return {
            success: true,
            provider: provider.identifier,
            cookies: extracted,
        };
    });
}
// --- Refresh Token Storage Helpers ---
function getStoredEntries() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || {};
    });
}
function setStoredEntries(entries) {
    return __awaiter(this, void 0, void 0, function* () {
        yield chrome.storage.local.set({ [STORAGE_KEY]: entries });
    });
}
function ensureAlarm() {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield chrome.alarms.get(REFRESH_ALARM_NAME);
        if (!existing) {
            chrome.alarms.create(REFRESH_ALARM_NAME, { periodInMinutes: 1440 });
        }
    });
}
function clearAlarmIfEmpty() {
    return __awaiter(this, void 0, void 0, function* () {
        const entries = yield getStoredEntries();
        if (Object.keys(entries).length === 0) {
            yield chrome.alarms.clear(REFRESH_ALARM_NAME);
        }
    });
}
// --- Background Cookie Refresh ---
function refreshAllCookies() {
    return __awaiter(this, void 0, void 0, function* () {
        const entries = yield getStoredEntries();
        for (const [integrationId, entry] of Object.entries(entries)) {
            try {
                const provider = getProvider(entry.provider);
                if (!provider)
                    continue;
                const cookieResult = yield extractCookies(provider);
                if (!cookieResult.success)
                    continue;
                const base64Cookies = btoa(JSON.stringify(cookieResult.cookies));
                yield fetch(`${entry.backendUrl}/integrations/extension-refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jwt: entry.jwt, cookies: base64Cookies }),
                });
            }
            catch (_a) {
                // Silently skip — will retry next cycle
            }
        }
    });
}
// --- Alarm Listener ---
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REFRESH_ALARM_NAME) {
        refreshAllCookies();
    }
});
// --- Ensure alarm on startup ---
(() => __awaiter(void 0, void 0, void 0, function* () {
    const entries = yield getStoredEntries();
    if (Object.keys(entries).length > 0) {
        yield ensureAlarm();
    }
}))();
// --- Message Listener ---
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    var _a;
    const origin = (_a = sender.origin) !== null && _a !== void 0 ? _a : sender.url;
    if (!isOriginAllowed(origin)) {
        sendResponse({ error: 'Unauthorized origin' });
        return true;
    }
    switch (message.type) {
        case 'PING': {
            sendResponse({ status: 'ok', version: EXTENSION_VERSION });
            break;
        }
        case 'GET_PROVIDERS': {
            const providers = getAllProviders();
            const providerInfos = providers.map((p) => ({
                identifier: p.identifier,
                name: p.name,
                url: p.url,
                cookieNames: p.cookies.map((c) => c.name),
            }));
            sendResponse({ providers: providerInfos });
            break;
        }
        case 'GET_COOKIES': {
            const provider = getProvider(message.provider);
            if (!provider) {
                sendResponse({
                    success: false,
                    provider: message.provider,
                    error: `Unknown provider: ${message.provider}`,
                });
                break;
            }
            extractCookies(provider)
                .then((result) => sendResponse(result))
                .catch((err) => sendResponse({
                success: false,
                provider: message.provider,
                error: `Failed to extract cookies: ${err.message}`,
            }));
            return true;
        }
        case 'STORE_REFRESH_TOKEN': {
            (() => __awaiter(void 0, void 0, void 0, function* () {
                const entries = yield getStoredEntries();
                entries[message.integrationId] = {
                    jwt: message.jwt,
                    backendUrl: message.backendUrl,
                    provider: message.provider,
                };
                yield setStoredEntries(entries);
                yield ensureAlarm();
                sendResponse({ success: true });
            }))().catch(() => sendResponse({ success: false }));
            return true;
        }
        case 'REMOVE_REFRESH_TOKEN': {
            (() => __awaiter(void 0, void 0, void 0, function* () {
                const entries = yield getStoredEntries();
                delete entries[message.integrationId];
                yield setStoredEntries(entries);
                yield clearAlarmIfEmpty();
                sendResponse({ success: true });
            }))().catch(() => sendResponse({ success: false }));
            return true;
        }
        default: {
            sendResponse({ error: `Unknown message type: ${message.type}` });
            break;
        }
    }
    return true;
});
//# sourceMappingURL=background.js.map