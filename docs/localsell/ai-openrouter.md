# OpenRouter AI

The OpenRouter provider is a server-side injectable service.  It receives an allowlisted request built from product context, store name, platform, language, tone and campaign type.  API keys and raw provider requests never reach the browser.

The content service asks for a validated JSON object:

```json
{"headline":"","caption":"","description":"","cta":"","hashtags":[],"creativeText":"","language":"","platform":""}
```

Zod/DTO validation rejects malformed output before it is saved.  Every request emits an `AiUsageEvent` with tenant, store, user, provider, model, request type, token usage if supplied, generated-media count, timestamp and success/failure.  Monthly limits are enforced before invoking a provider.

Existing OpenAI and FAL services remain supported.  OpenRouter is additive and configurable by environment, so changing a model does not require a code change.
