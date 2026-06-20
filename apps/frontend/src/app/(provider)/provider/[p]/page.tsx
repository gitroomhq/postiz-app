/**
 * Provider settings WebView bridge.
 *
 * URL: /provider/:p  (e.g. /provider/tiktok, /provider/instagram)
 *
 * --- Auth (native -> WebView, via URL) ---
 * Append `?loggedAuth=<jwt>` to the URL. The shared fetch wrapper
 * (libraries/helpers/src/utils/custom.fetch.func.ts) reads that search
 * param on every request and attaches it as the `auth` header, so any
 * authenticated API call made by the SettingsComponent or checkValidity
 * just works. The (provider) route is also excluded from the 401->/
 * redirect logic in LayoutContext, so a stale token won't yank the
 * WebView away from the form.
 *
 * --- Initial state (native -> WebView, push once) ---
 * Before loading the URL, the native side injects a global:
 *
 *   webView.injectJavaScript(`window.__PROVIDER_INIT__ = ${JSON.stringify({
 *     value: { ...currentSettings },   // optional, shape = provider DTO
 *     errors: ['...'],                 // optional, prior validation errors
 *     integration: { ... },            // optional Partial<Integration>
 *   })};`);
 *
 * The bridge reads this once on mount (see ./bridge.tsx).
 *
 * --- Reading values & validation (native -> WebView, pull on demand) ---
 * No messages are posted from the WebView. Instead, native calls these
 * globals (they are defined once the bridge's effect has run):
 *
 *   // Returns the current form values, no validation:
 *   webView.evaluateJavaScript('window.__getProviderPreviewValues__()')
 *     // => { ...settings }
 *
 *   // Triggers validation and returns isValid + flattened error strings:
 *   webView.evaluateJavaScript('window.__validateProviderPreview__()')
 *     // => Promise<{ isValid: boolean, value: {...}, errors: string[] }>
 *
 *   // Returns the provider's resolved character limit (number) or null
 *   // when the provider doesn't declare one. Uses the seeded
 *   // __PROVIDER_INIT__.integration.additionalSettings:
 *   webView.evaluateJavaScript('window.__getProviderMaxCharacters__()')
 *     // => number | null
 *
 * React Native example (RN WebView ref):
 *   const js = `window.__validateProviderPreview__().then(r =>
 *     window.ReactNativeWebView.postMessage(JSON.stringify(r)));
 *     true;`;
 *   webViewRef.current?.injectJavaScript(js);
 *
 * Native should wait for page load (onLoadEnd / didFinishNavigation) before
 * calling these. If called before the bridge mounts, the validate getter
 * returns { isValid: false, errors: ['not-ready'] } and the values getter
 * returns {}.
 *
 * If a different channel is needed, adjust ./bridge.tsx — this page is only
 * a server wrapper that forwards the `:p` route param.
 */
import { InBridge } from '@gitroom/frontend/app/(provider)/provider/[p]/in-bridge';

export default async function Page({
  params,
}: {
  params: Promise<{ p: string }>;
}) {
  const { p } = await params;
  return <InBridge provider={p} />;
}
