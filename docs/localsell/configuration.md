# Configuration

All values are server-only unless explicitly marked public.  Do not expose these values through Next.js public variables, browser bundles, logs, screenshots, or support exports.

```dotenv
# Localsell trust and API
LOCALSELL_SSO_ISSUER="https://localsell.example"
LOCALSELL_SSO_AUDIENCE="postiz-marketing"
LOCALSELL_SSO_JWKS_URL="https://localsell.example/.well-known/jwks.json"
LOCALSELL_API_BASE_URL="https://api.localsell.example"
LOCALSELL_API_CLIENT_ID=""
LOCALSELL_API_CLIENT_SECRET=""

# Versioned key used only to encrypt stored third-party credentials.
LOCALSELL_CREDENTIAL_ENCRYPTION_KEY=""

# OpenRouter
OPENROUTER_API_KEY=""
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_TEXT_MODEL=""
OPENROUTER_VISION_MODEL=""
OPENROUTER_IMAGE_MODEL=""

# WhatsApp Cloud API
WHATSAPP_APP_SECRET=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN=""
WHATSAPP_GRAPH_API_VERSION=""
```

Reuse `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `FRONTEND_URL`, `OPENAI_API_KEY`, `FAL_KEY`, and existing Facebook configuration as documented in the root `.env.example`.  Configure allowed origins and HTTPS in production before SSO/OAuth or webhooks are enabled.
