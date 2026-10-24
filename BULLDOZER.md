# Bulldozer Social (بلدوزر سوشيل)

A fork of [Postiz](https://github.com/gitroomhq/postiz-app) that adds **comment and DM auto replies** ported from
[OpenReply](https://github.com/diwenne/openreply). Everything Postiz does keeps working unchanged: the feature is
additive (new models, a new module, a new workflow, a new settings tab).

## What it adds

| Feature | Details |
|---|---|
| Comment to DM | A comment with a keyword (or any comment) on one post or on any post gets a private reply (Instagram Private Replies) |
| Public reply | A reply under the comment, one or several (picked at random) |
| Link button | The DM can carry a link as a button, with an automatic plain text fallback |
| Opening DM | The first DM is a short message with a button, the content is sent when they tap it (or 5 minutes after they read it) |
| Followers only | The content is sent only to followers, with a follow prompt and automatic re-checks while a new follow registers |
| Follow-up | A second message after N minutes |
| DM / story reply trigger | The same keywords also work when they arrive as a DM or a story reply |
| Arabic aware matching | Teh marbuta, alef forms, Persian / Arabic yeh and kaf, harakat, tatweel and Eastern digits are normalized on both sides |
| Activity log | Every attempt with its status and error, per auto reply |
| Inbox | Read Instagram conversations and reply from Postiz (inside the 24 hour window) |
| Safety | Signed webhooks, one private reply per comment, hourly rate limit (750), sends are claimed before they go out so a retry never repeats an uncertain delivery |

Supported channel: **Instagram (Standalone)**, the Instagram Login channel that needs no Facebook page.
Other providers can join by implementing the optional `autoReply*` methods of `SocialProvider`.

## Where the code lives

| Layer | Files |
|---|---|
| Database | `AutoReply`, `AutoReplyLog`, `AutoReplyStatus` in `libraries/nestjs-libraries/src/database/prisma/schema.prisma` |
| Provider contract | `autoReply*` methods and types in `social.integrations.interface.ts`, `AutoReplySendError` in `social.abstract.ts` |
| Instagram | `instagram.standalone.provider.ts` (webhook signature, parsing, Graph API calls) |
| Engine | `database/prisma/auto-replies/auto-replies.service.ts` + `.repository.ts` |
| Keyword matching | `libraries/helpers/src/utils/keyword.matcher.ts` |
| API | `apps/backend/src/api/routes/auto-replies.controller.ts` (authenticated), `auto-replies.webhook.controller.ts` (public, signed) |
| Background | `apps/orchestrator/src/workflows/auto.reply.workflow.ts`, `activities/auto.reply.activity.ts` |
| UI | Settings > Auto Replies (`apps/frontend/src/components/auto-replies/auto-replies.tsx`), menu item `/auto-replies` |

Every webhook event starts its own Temporal workflow (`autoReplyWorkflow`), the workflow id dedupes Meta retries.
Delays (follow-up, follow re-check, read fallback, rate limit retry) are delayed workflow starts.

## Environment

| Variable | Purpose |
|---|---|
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | The Instagram app (already used by Postiz). The secret also verifies webhook signatures |
| `INSTAGRAM_AUTO_REPLIES=true` | Requests `instagram_business_manage_messages` when connecting Instagram (Standalone). Reconnect the channel after turning it on |
| `AUTO_REPLIES_WEBHOOK_VERIFY_TOKEN` | Any random string, pasted in the Meta webhook settings |
| `FACEBOOK_APP_SECRET` | Optional, also accepted for webhook signatures |
| `FOLLOW_RECHECK_DELAYS_MS` | Optional, default `20000,40000` |

## Meta app setup

1. developers.facebook.com, create an app with the **Instagram API with Instagram Login** use case.
2. Instagram > API setup: add your Instagram account as an **Instagram Tester** and accept the invite in the Instagram app.
3. Copy the **Instagram app ID / secret** (not the Facebook ones) into `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`.
4. Business login settings, OAuth redirect URI: `<FRONTEND_URL>/integrations/social/instagram-standalone`.
5. Webhooks: callback `<NEXT_PUBLIC_BACKEND_URL>/auto-replies-webhook/instagram-standalone`, verify token
   `AUTO_REPLIES_WEBHOOK_VERIFY_TOKEN`, subscribe to `comments`, `messages`, `messaging_postbacks`, `messaging_seen`.
   Settings > Auto Replies shows the exact callback URL.
6. Meta only delivers real comment webhooks when the app is **Live**. Publishing needs a privacy policy URL,
   a terms URL and a data deletion URL. For your own account no App Review is needed.
7. In Postiz: add the **Instagram (Standalone)** channel, then Settings > Auto Replies > Add an auto reply.
   Saving subscribes the account to webhooks automatically.

## Quick test on Kaggle (temporary)

Notebook with **Internet on**. Add Kaggle secrets `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET`, then run:

```python
import os, subprocess
from kaggle_secrets import UserSecretsClient
s = UserSecretsClient()
env = {**os.environ,
       "INSTAGRAM_APP_ID": s.get_secret("INSTAGRAM_APP_ID"),
       "INSTAGRAM_APP_SECRET": s.get_secret("INSTAGRAM_APP_SECRET")}
subprocess.run("curl -fsSL https://raw.githubusercontent.com/Dev-saged/postiz-app/feature/bulldozer-replies/deploy/kaggle/bulldozer-kaggle.sh -o /root/bulldozer-kaggle.sh && bash /root/bulldozer-kaggle.sh",
               shell=True, check=True, env=env)
```

It prints the app URL, the OAuth redirect URI, the webhook URL and the verify token. The quick tunnel URL changes
every run, so update the redirect URI and the webhook in the Meta app each time. Keep the notebook cell running:
the stack lives only as long as the session.

## Limits that come from Instagram

- One private reply per comment, ever, and only within 7 days of the comment.
- Messages outside a private reply need the user to have written in the last 24 hours.
- `is_user_follow_business` is only known once the user is in a conversation with the account.

## Attribution

The auto reply engine, the webhook parsing and the keyword matcher are ported from
[OpenReply](https://github.com/diwenne/openreply), MIT License, Copyright (c) 2026 Anish Raj, Copyright (c) 2026 Diwen Huang.
Postiz is AGPL-3.0: if you offer a modified version as a hosted service, you must publish your changes.
