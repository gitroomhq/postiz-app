# Multi-user workspace architecture

## What is included

The Admin UI now uses Postiz authentication for every workspace action and stores only the local access-control policy in the persistent `admin_data` Docker volume:

```
Postiz account login → Admin UI session validation → local workspace policy
                                               ├─ role permissions
                                               └─ assigned Postiz channel IDs
```

No passwords, OAuth secrets, or social tokens are copied into the role policy. `access-control.json` is created automatically inside the `admin_data` Docker volume. It survives Admin UI container recreation.

## Roles

| Role | Intended access |
| --- | --- |
| Owner | Everything: credentials, Docker actions, team access and all channels. |
| Admin | Manage members/channel assignments, create/edit/publish posts and view analytics. |
| Editor | Create/edit/rewrite/schedule/publish posts for assigned channels. |
| Analyst | Read posts and analytics for assigned channels. |
| Viewer | Read posts and assigned channels. |

The first successfully authenticated Postiz user becomes the Owner. All other users must already have a Postiz account and are added by email in **Team & Access**.

## Channel access

An assignment contains zero or more Postiz integration IDs. Zero means all channels. Select specific channels when adding a member, or update the multi-select under that member in **Team & Access**.

The custom Admin UI filters its Channels screen and authorizes its Postiz proxy according to these roles. Postiz's native team model also remains available for organization membership. Do not give untrusted users direct network access to port `4007`, because upstream Postiz itself does not have channel-level roles; use the Admin UI as the controlled workspace entry point.

## Deploy

After changing this code, rebuild the Admin UI container:

```bash
docker compose up -d --build admin-ui
```

Open `http://localhost:3001`, sign in with the Owner's existing Postiz account, then open **Team & Access** to create roles and channel assignments.
