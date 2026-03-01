/**
 * Generic interface for handling inbound webhooks from external platforms.
 *
 * Each social/integration provider that supports inbound webhooks
 * implements this interface and registers itself with the IntegrationManager.
 *
 * Routing is done via URL path: POST /inbound-webhooks/:providerName
 */
export interface WebhookProvider {
  /** Unique identifier matching the provider name in the URL path */
  providerName: string;

  /**
   * Process an incoming webhook payload from the external platform.
   * @param payload - The parsed request body (JSON)
   * @param headers - The raw request headers
   * @returns An optional response body to send back to the caller
   */
  handleWebhook(
    payload: any,
    headers?: Record<string, string>
  ): Promise<WebhookResponse>;

  /**
   * Optional: Verify the authenticity of an incoming webhook request.
   * Providers should implement this to validate signatures, tokens, etc.
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
}
