# Authentication and tenant isolation

Localsell and Postiz do not share passwords.  Localsell sends a signed, short-lived assertion to a server-side exchange endpoint.  The endpoint validates issuer, audience, expiry, signature and one-time `jti`, then resolves:

`Localsell subject -> Localsell business -> Localsell store -> Postiz user + Organization`.

The exchange creates a normal Postiz session only for an existing authorized mapping.  It never trusts organization/store IDs supplied by a browser without resolving them against the mapping table.  New mappings are administrator-managed; automatic account linking is disabled by default.

Postiz’s existing authentication middleware continues to reload users and organization memberships from the database.  A Localsell store-context guard is added after it for integration routes.
