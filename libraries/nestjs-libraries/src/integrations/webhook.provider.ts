/**
 * Generic interface for handling inbound webhooks from external platforms.
 *
 * Each social/integration provider that supports inbound webhooks
 * implements this interface and registers itself with the IntegrationManager.
 *
 * Routing:
 *   POST /inbound-webhooks/:providerName  — event delivery
 *   GET  /inbound-webhooks/:providerName  — verification challenges
 */
export interface WebhookProvider {
  /** Unique identifier matching the provider name in the URL path */
  providerName: string;

  /**
   * Process an incoming webhook event (POST).
   * @param payload - The parsed request body (JSON)
   * @param headers - The raw request headers
   * @returns An optional response body to send back to the caller
   */
  handleWebhook(
    payload: any,
    headers?: Record<string, string>
  ): Promise<WebhookResponse>;

  /**
   * Optional: Handle a GET-based verification/challenge request.
   *
   * Many platforms (Facebook, WhatsApp, etc.) verify webhook ownership by
   * sending a GET request with challenge parameters in the query string.
   *
   * @param query - The parsed query parameters (e.g. hub.mode, hub.challenge)
   * @returns A response to satisfy the platform's verification check
   */
  handleVerification?(
    query: Record<string, string>
  ): Promise<WebhookResponse>;

  /**
   * Optional: Verify the authenticity of an incoming webhook event (POST).
   *
   * The rawBody parameter is the unparsed request buffer — use this for
   * HMAC signature verification, NOT the parsed JSON payload.
   *
   * @param rawBody - The raw, unparsed request body as a Buffer
   * @param headers - The raw request headers
   * @returns true if the request is authentic
   */
  verifyWebhook?(
    rawBody: Buffer,
    headers?: Record<string, string>
  ): Promise<boolean>;
}

export interface WebhookResponse {
  /** HTTP status code to return (defaults to 200) */
  statusCode?: number;
  /** Response body to return to the webhook caller */
  body?: any;
  /** Content-Type header (e.g. 'text/plain' for verification challenges) */
  contentType?: string;
}
