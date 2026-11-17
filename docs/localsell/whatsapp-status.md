# WhatsApp Status

`WHATSAPP_STATUS` is a content destination, not a WhatsApp Cloud API message type. Postiz must not use browser automation, WhatsApp Web, reverse-engineered APIs, or a simulated publish result for Status.

## Current behavior

Status has no verified official Business Platform publishing API in the current capability review. The supported workflow is:

1. Generate a mobile-first 1080×1920 creative, short copy and CTA.
2. Let the user preview and edit the asset in Postiz.
3. Schedule a reminder or export the approved image/video.
4. An authorized business user posts it manually in WhatsApp Business.
5. Mark the destination `MANUALLY_PUBLISHED` only after user confirmation.

The future `WhatsAppStatusProvider` must expose `supportsDirectPublishing()` and return `false` until Meta documents and enables a supported publishing endpoint.
