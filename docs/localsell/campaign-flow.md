# Campaign flow

1. A signed Localsell session selects an authorized business and store.
2. The product API returns references and a minimal cache snapshot is refreshed when required.
3. The user asks the AI composer for a post or campaign in English, Hindi or both.
4. The content service generates structured copy and optional media prompts; the user sees a preview and edits it.
5. Saving creates normal organization-scoped Postiz `Media` and `Post` drafts.
6. The user explicitly saves, schedules or publishes through the existing Postiz composer and Temporal workflow.
7. Channel/provider status is read from the existing Postiz post state; WhatsApp delivery is tracked separately when implemented.

No conversational or voice request publishes automatically.  Product data is context for the creative, not a replacement for Postiz post ownership.
