# Buffer channel

## Goal

A channel that publishes a scheduled Postiz post through Buffer. You connect
it with a Buffer API key, then pick one Buffer profile. Each profile is its
own sidebar channel. A post can include a Buffer channel next to any other
channel, and several posts can go to the same Buffer channel at different
times.

Postiz remains the scheduler. At the scheduled time that channel tells
Buffer to publish immediately. Buffer's queue, Buffer's scheduled time, and
Buffer's MCP server are not used.

## Connecting

Adding Buffer uses the connect form, then the existing profile picker. There
is no OAuth app.

- **API key.** One password field. It is stored on the channel and is not
  shown again. A missing key is rejected before a channel is saved. Before
  the channel row is saved, Postiz asks Buffer for the account. A key Buffer
  rejects fails the connect and does not leave a channel.
- **Profiles.** After the key is accepted, Postiz loads every profile from
  every organization on that Buffer account. The picker shows each profile's
  name, network, and avatar. You pick one. That pick becomes one sidebar
  channel. The channel id is the Buffer profile id. The stored name, picture,
  and profile come from that Buffer profile (`name`, `avatar`, `service`).
  If Buffer returns no avatar, the channel picture is
  `/icons/platforms/buffer.png`.
- **Channel list icon.** The sidebar row's corner badge, and the tile in the
  add-channel grid, are `/icons/platforms/buffer.png`. The provider identifier
  is `buffer`, so those screens load that file with no special case. The file
  is Buffer's own icon from `https://buffer.com/icons/buffer-icon.svg`: three
  stacked layers, fill `#132062`, on a transparent 50×50 PNG, the same size as
  the other platform icons. It is not a redraw, and it is not the Instagram,
  LinkedIn, or other network logo of the connected profile. The large photo on
  the row stays that profile's Buffer avatar.
- **Another profile.** Add Channel again with the same key and pick a
  different profile. The picker saves one profile per connect.
- **Same profile again.** Picking a profile that is already connected updates
  that existing channel's key, name, and picture. It does not create a second
  row. The unfinished row from this attempt is removed.
- **Update credentials.** Asks for the API key again and keeps the same
  profile. The picker is not shown.

Connecting lists profiles and does not publish. Closing the picker before a
choice leaves the unfinished row that other two-step channels already leave.
That row can be resumed or deleted.

## What gets sent

`POST https://api.buffer.com` with `Content-Type: application/json` and
`Authorization: Bearer` set to that channel's API key. The body is a GraphQL
`createPost` mutation. Text, the Buffer profile id, and asset URLs are
variables, not pasted into the query string.

The input is:

- `text`: the post text
- `channelId`: the Buffer profile id stored on the channel
- `schedulingType`: `automatic`
- `mode`: `shareNow`
- `assets`: the post's media, in order

An image is `{ image: { url } }`. A video is `{ video: { url } }`. The URL
is the media `path` already stored on the post. No thumbnail offset, no
document, no link card, no thread, no first comment, no tags, no
`metadata`, no `dueAt`, and no draft flag.

A post with no text and no image or video fails before the call. A media
item whose `path` is not a public `https` URL fails the post before the
call. Postiz does not upload the file to Buffer.

The composer is the normal text and media editor. There is no Buffer
settings panel. `settings` is the empty object that editor stores. The
composer allows up to 100000 characters. A length Buffer will not accept
fails the post when Buffer rejects it.

The request waits at most 30 seconds.

## Failure

Success is HTTP 2xx and a GraphQL `PostActionSuccess` that includes a post
id. The calendar stores that id. If that payload includes `externalLink`, that URL is the
release link. If it does not, the release link is empty. Postiz does not
poll Buffer after this.

Any of these marks that post failed, the same way a social post fails, so
it shows on the calendar and can be tried again:

- the connection fails or times out
- the response status is outside 200–299
- the payload contains a GraphQL error or `MutationError`
- the post has no text and no media, or a media URL is not public `https`

The error recorded on the post does not include the API key or the request
body. A thrown error from `post()` is what fails the post.

## What stays the same

The webhook channel, the webhook settings screen, and `sendWebhooks` are
unchanged. After this channel succeeds, that existing step still runs for
it, as it does for every other channel. It does not run when the send
fails, because the post never reaches that step.

No post workflow file changes. Buffer logic stays inside the Buffer
provider. The provider is registered with the other channels, the empty
settings type accepts `__type: "buffer"`, and the new files, including
`apps/frontend/public/icons/platforms/buffer.png`, are copied into
`Dockerfile.overlay` so a published image contains them.

Tests cover the profile list across more than one organization, a repeated
profile updating the existing channel, a `shareNow` payload for text, an
image, and a video, and a failure whose message does not contain the API
key.
