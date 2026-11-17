# Architecture

Localsell maps a business to a Postiz organization and a store to a scoped child context.  Existing `UserOrganization`, `Integration`, `Post`, `Media`, PostsService and Temporal workflows are reused.

```
Localsell -> short-lived signed assertion -> Postiz SSO exchange
          -> organization/store authorization -> marketing routes
          -> product context cache -> AI composer -> Postiz draft/media
          -> existing Temporal workflow -> connected social provider
```

New code is isolated in Localsell, AI provider and WhatsApp provider/service folders.  It must not fork Postiz scheduling or place Localsell business rules in social providers.

Every database read/write filters by `organizationId` and authorized store scope.  API payloads use external product/store IDs only; Postiz caches only fields needed for a marketing preview.
