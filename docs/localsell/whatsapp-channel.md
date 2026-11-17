# WhatsApp Channel

`WHATSAPP_CHANNEL` is a planned campaign destination for announcements, launches, sales and coupon content. It is separate from 1:1 WhatsApp messaging and must not reuse message recipient APIs.

## Current behavior

No verified official Meta Business Platform API is available for programmatic posting to WhatsApp Channels in this integration. Postiz therefore supports only a manual-publish architecture:

1. Generate an editable channel post, image/video creative and CTA.
2. Preview, approve, save or schedule a reminder.
3. Export/copy the content for an authorized Channel administrator.
4. Record a user-confirmed manual publish result.

Direct publishing can be added only behind a dedicated provider after Meta releases an applicable official Channel API.
