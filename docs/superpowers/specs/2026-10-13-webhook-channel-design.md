# Webhook channel

## Goal

A channel whose publication is an HTTP request. You connect it with a name,
a URL, and any headers you want sent with it. You can connect more than one,
each with its own URL.
You schedule posts to it on the calendar, including several posts to the
same channel at different times, and a post can include a webhook channel
next to any other channel.

At the scheduled time that channel POSTs the scheduled post. The webhook
settings screen is not involved in this send.

## Connecting

Adding the channel uses the connect form, no OAuth. The header list is a
repeatable name and value, not a single fixed field.

- **Name.** Shown on the channel, the same way other channels show a name.
- **URL.** Must be `https`. Checked with the existing public-URL and SSRF
  rules at connect time, and again when the request is sent.
- **Headers.** Zero or more rows. Each row is a header name and a value.
  Both are stored with the channel credentials. Values are not returned in
  the post JSON and are not shown again after connect. A row with no name
  is rejected. Two rows with the same name are rejected. Names that would
  replace the request itself are rejected: `Content-Type`, `Content-Length`,
  `Host`, `Connection`, `Transfer-Encoding`, and `Upgrade`.

Connecting does not call the URL. A bad URL or a bad header row is rejected
before the channel is saved. Changing the URL or the headers is done by
removing the channel and connecting it again.

## What gets sent

`POST` the URL with `Content-Type: application/json`, then every header
saved on that channel. Nothing else is added. A channel with no header rows
sends only the content type and the body.

The body is a one-element array in the same shape
`getPostByForWebhookId` already returns for the publish webhook:

- `id`, `content`, `publishDate`, `releaseURL`, `state`
- `image` and `settings` parsed from their stored JSON (arrays and objects,
  not strings)
- `integration`: `id`, `name`, `providerIdentifier`, `picture`, `type`

`releaseURL` is empty. This request is the publication, so there is no
link to send yet. `state` is the post's state at send time. There is no
extra platform settings panel: the composer is the normal text and media
editor, and `settings` is whatever that editor stored (an empty object
when nothing was set).

The request uses the existing SSRF-safe dispatcher. It waits at most 30
seconds.

## Failure

Any of these marks that post failed, the same way a social post fails, so
it shows on the calendar and can be tried again:

- the connection fails, times out, or is blocked by the SSRF check
- the response status is outside 200–299

The error recorded on the post does not include header values or the
response body. A success is a 2xx response and nothing else. The channel does not
read the response.

## What stays the same

The webhook settings screen, its URLs, and `sendWebhooks` are unchanged.
After this channel succeeds, that existing step still runs for it, as it
does for every other channel. It does not run when the send fails, because
the post never reaches that step.

No post workflow file changes. The channel publishes through `post()` on a
new provider. A thrown error from `post()` is what fails the post.
