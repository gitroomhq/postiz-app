export interface CookieDefinition {
  /** The cookie name to extract, e.g., 'client_id' */
  name: string;
  /** Whether this cookie must exist for the extraction to be considered successful */
  required: boolean;
}

export interface CookieProvider {
  /** Unique identifier used in messages, e.g., 'skool' */
  identifier: string;
  /** Human-readable name, e.g., 'Skool' */
  name: string;
  /** URL to query cookies for, e.g., 'https://www.skool.com' — passed to chrome.cookies.getAll({ url }) */
  url: string;
  /** URL pattern for host_permissions in manifest, e.g., '*://*.skool.com/*' */
  hostPermission: string;
  /** List of cookies to extract from this site */
  cookies: CookieDefinition[];
}
