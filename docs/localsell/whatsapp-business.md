# WhatsApp Business messaging

## Current Postiz implementation

Postiz has a native **WhatsApp Business** provider under **Integrations → Add Channel**. A business administrator connects a Meta Cloud API Phone Number ID and a server-side Meta access token. The provider sends text, approved-template, image and video messages through `/{phone-number-id}/messages`; the API token is never returned by the UI.

The composer requires an E.164 recipient number. A plain text/media message is only appropriate when Meta permits customer-service messaging; a business-initiated message outside that window must use an approved template. The provider returns Meta's message ID to the normal Postiz publishing workflow.

## Capability matrix — reviewed 2026-09-22

| Feature | Official Business Platform API | Automatic publishing in Postiz | Manual fallback |
| --- | --- | --- | --- |
| 1:1 text, template and media messages | Yes | Yes, after a channel is connected | Not needed |
| Template messages | Yes, after Meta approval | Yes | Use Meta Business Manager to create/approve template |
| Image/video/document message payloads | Yes | Image/video currently; document support is a planned provider extension | Send or share manually |
| Message status webhooks | Yes | Not yet implemented | Meta Business Manager history |
| WhatsApp Status posts | No supported Cloud API publishing endpoint identified | No | Generate/export a vertical creative; user posts in WhatsApp Business |
| WhatsApp Channel posts | No supported Cloud API publishing endpoint identified | No | Generate/export content; channel administrator posts manually |

The message capabilities are based on Meta's official WhatsApp Business Platform collection, which documents text, media and templates at `/{Phone-Number-ID}/messages` and status tracking by webhook: <https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ba8d099d-007e-4b52-b9f2-3cf3c60e4fbc>.

## Planned production-hardening work

Before using high-volume campaigns, add an encrypted credential record, verified raw-body webhook endpoint, durable message records, idempotency keys, retry classification and delivery/read state transitions. Those features are intentionally not claimed as implemented by the current provider.
