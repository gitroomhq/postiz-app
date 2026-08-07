#!/usr/bin/env node
//
// Puts realistic (including long) posts on a development calendar so calendar
// cells, the posts panel, and Create Post / post cards can be judged for
// truncation, wrapping and overflow.
//
//   node scripts/seed-dev-posts.mjs --org <id> --dry
//   node scripts/seed-dev-posts.mjs --org <id>
//   node scripts/seed-dev-posts.mjs --org <id> --reset
//   node scripts/seed-dev-posts.mjs --org <id> --revoke
//
// `--org` is required. Channels: uses every non-disabled channel already on
// the org (round-robin — LinkedIn, Mastodon, X, … if present). If the org has
// none, run `seed-dev-channel.mjs` or `seed-dev-workspace.mjs` first.
//
// Dates sit in the current calendar week (Mon–Sun, local) so week view shows
// them without hunting. Past slots are DRAFT; today-and-later slots are mostly
// QUEUE so the worker is not hammered by stale publish attempts. Tokens on
// seeded channels are invalid — nothing here can publish successfully.
//
// `--reset` deletes this script's previous rows (`dev-seed-posts*`) and
// re-seeds. `--revoke` removes them and stops. `--dry` prints the plan.
//
// NOT FOR PRODUCTION.
import { PrismaClient } from '@prisma/client';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const dry = process.argv.includes('--dry');
const revoke = process.argv.includes('--revoke');
const reset = process.argv.includes('--reset');
const orgId = arg('org');

const GROUP = 'dev-seed-posts';

// dayOffset: 0 = Monday of the current local week … 6 = Sunday.
// Content is HTML (multiple <p>) so calendar / panel stripping matches real posts.
const ROWS = [
  {
    dayOffset: 0,
    hour: 9,
    minute: 30,
    state: 'DRAFT',
    title: 'Monday planning note',
    preferred: ['linkedin-page', 'linkedin', 'facebook'],
    content: [
      'Monday planning — still shaping this before we schedule it.',
      'Last week we shipped the calendar redesign and the posts panel in the same release. The part that surprised people was not the new chrome; it was how much easier it became to spot a post that had drifted into the wrong hour.',
      'Questions I still want answered before we hit Publish:',
      '• Did anyone actually open the month view on a phone?',
      '• Are the channel counters matching what people expect after a drag?',
      '• Is the draft tab still the place people look first, or did Scheduled win?',
      'Drop notes in the thread. If we cannot answer those by Wednesday, this stays a draft.',
      '#buildinpublic #product',
    ].join('</p><p>'),
  },
  {
    dayOffset: 1,
    hour: 14,
    minute: 0,
    state: 'DRAFT',
    title: 'Customer story — long cut',
    preferred: ['linkedin-page', 'linkedin'],
    content: [
      'How one team schedules a month ahead — without living in a spreadsheet.',
      'Northwind used to plan content in a shared doc, then re-type every post into three tools the morning it was due. Approvals were emoji reactions. Missed slots were “we will catch it next week.”',
      'They moved the same workflow into one calendar: draft → review → queue. Each channel keeps its own voice, but the week is visible at a glance. The ops lead told us the first win was not “more posts.” It was fewer 9pm fire drills when someone remembered a launch the night before.',
      'What changed in practice:',
      '1. One owner per week, not one owner per channel.',
      '2. Drafts that look like the final post — so review is about the message, not the formatting.',
      '3. A buffer of two ready posts so a sick day does not erase the plan.',
      'If your team still copies the same paragraph into LinkedIn, then again into Mastodon, then again into a chat channel… this is the story we keep hearing.',
      'Full write-up (and the template they shared) in the comments. Happy to connect you with their marketing lead if you want the unfiltered version.',
      '#customersuccess #socialmedia #scheduling',
    ].join('</p><p>'),
  },
  {
    dayOffset: 2,
    hour: 11,
    minute: 15,
    state: 'DRAFT',
    title: 'Thread: week in review',
    preferred: ['mastodon', 'bluesky', 'threads', 'x'],
    content: [
      'Week in review (draft — still trimming).',
      '1/ We finally stopped treating “scheduled” and “draft” as the same pile. The posts panel now keeps them honest, and the calendar cells show enough of the body that you can tell two posts apart without opening either.',
      '2/ Long posts were the stress test. A one-line teaser always looked fine. A LinkedIn-length update with line breaks? That is where truncation, wrapping, and overflow either earn trust or look broken.',
      '3/ If you are reading this in the panel: good. If you are reading a clipped first line in the grid: also good — that is the behaviour we are checking.',
      '4/ Mentions for the people who filed the original overflow bugs: @design @frontend — thank you for the screenshots with the short copy. Next round needs the long ones.',
      '5/ Shipping notes + GIFs later today. Boost if your team has been burned by a calendar that only works for tweets.',
      '#fediverse #buildinpublic',
    ].join('</p><p>'),
  },
  {
    dayOffset: 3,
    hour: 10,
    minute: 30,
    // Past-of-now QUEUE slots become PUBLISHED automatically (see effectiveState).
    state: 'QUEUE',
    title: 'AMA announcement',
    preferred: ['mastodon', 'x', 'bluesky'],
    content: [
      'Ask us anything — Thursday at noon (your local time on the calendar).',
      'Bring the awkward questions. The ones we get most:',
      '• How do you keep a multi-channel week from turning into five slightly different posts?',
      '• What breaks first when a team grows from 2 channels to 12?',
      '• Draft vs queue — who should own the last click?',
      'We will answer live in the replies, then turn the best ones into a short follow-up thread on Friday.',
      'No slides. No pitch deck. If you have been burned by a tool that looked great with one-line posts and fell apart on real copy, this hour is for you.',
      'Drop a question early if you cannot make it — we will still pull from the pile.',
      '#AMA #socialstrategy @northwind',
    ].join('</p><p>'),
  },
  {
    dayOffset: 4,
    hour: 9,
    minute: 0,
    state: 'QUEUE',
    title: 'Launch teaser — Friday',
    preferred: ['x', 'threads', 'bluesky'],
    content: [
      'Something new lands Friday.',
      'Not a rebrand. Not a pricing surprise. A small change to how a post looks when it is sitting on the calendar — the kind of thing you only notice after you have pasted a real LinkedIn paragraph into a cell that was designed for a tweet.',
      'We have been dogfooding with short lines for weeks. Useful. Incomplete. Today’s seed is the long version on purpose: multi-paragraph, line breaks, hashtags, a mention or two. If the card wraps cleanly, we celebrate. If it overflows, we fix it before anyone else has to file it.',
      'Teaser thread continues tomorrow with before/after shots. Reply with the longest post you regularly schedule — we will use a few as fixtures.',
      '#comingsoon #buildinpublic @northwind',
    ].join('</p><p>'),
  },
  {
    dayOffset: 4,
    hour: 11,
    minute: 30,
    state: 'QUEUE',
    title: 'Product update — long form',
    preferred: ['linkedin-page', 'linkedin', 'facebook'],
    content: [
      'Product update: what we shipped this week, and what we deliberately did not.',
      'Calendar week view now carries enough of each post body that you can scan a busy Thursday without opening every card. The posts panel on the side matches the same text — Scheduled, Draft, and Published stay separate so a draft never pretends it is already queued.',
      'We also tightened the create-post path: the editor, the preview, and the card in the grid are finally looking at the same content. That sounds obvious. It was not, once you had mentions, line breaks, and a hashtag block at the end.',
      'What we did not ship: a new billing flow, a new analytics chart, or another “AI rewrite this for me” button. Those can wait until the surfaces people live in every day feel solid with real posts — including the long ones.',
      'If you try this with your own copy, send a screenshot of anything that clips badly. We would rather fix overflow than invent another empty state.',
      '— The PostQueen team',
      '#productupdate #saas',
    ].join('</p><p>'),
  },
  {
    dayOffset: 4,
    hour: 15,
    minute: 30,
    state: 'DRAFT',
    title: 'Sixty second demo script',
    preferred: ['youtube', 'tiktok', 'instagram'],
    content: [
      'Draft — sixty-second demo script (do not queue until the recording is in).',
      'Hook (0–5s): “Your calendar looks fine until the post is longer than one line.”',
      'Beat 1 (5–20s): Show week view with short posts. Everything fits. Smile. Then drop in a real customer update — three paragraphs, a list, two hashtags.',
      'Beat 2 (20–40s): Pan the posts panel. Same copy in Scheduled vs Draft. Open Create Post and show the body intact in the editor.',
      'Beat 3 (40–55s): Drag the long card one hour later. Truncation should stay readable; no clipped glyphs; channel avatar still visible.',
      'Close (55–60s): “Schedule the post you actually write — not the one-line stand-in.”',
      'B-roll notes: LinkedIn cell, Mastodon cell, dark + light theme. No fake Stripe screens.',
      '#demo #wip',
    ].join('</p><p>'),
  },
  {
    dayOffset: 5,
    hour: 11,
    minute: 0,
    state: 'QUEUE',
    title: 'Weekend reading list',
    preferred: ['mastodon', 'bluesky', 'linkedin-page'],
    content: [
      'Weekend reading — five links we actually used while redesigning post cards.',
      '1. Truncation is a product decision, not a CSS accident. If the first line is always a title and the second is always fluff, people learn to ignore the card.',
      '2. Social posts are not emails. Paragraph breaks carry tone. Flattening everything to a single run-on line makes Mastodon and LinkedIn feel the same, and neither side likes that.',
      '3. Mentions and hashtags belong at the end more often than teams admit. Putting them first is how you get a calendar full of #launch #update and no idea what the post says.',
      '4. Drafts deserve the same card treatment as scheduled posts. A draft that looks “temporary” in the UI gets treated as throwaway copy.',
      '5. The best QA fixture is a boring, realistic paragraph — not lorem, not a novel, not a single slogan.',
      'Save this for Monday standup. Or argue with us in the replies; both are useful.',
      '#readinglist #design #contentops',
    ].join('</p><p>'),
  },
  {
    dayOffset: 6,
    hour: 10,
    minute: 0,
    state: 'QUEUE',
    title: 'Sunday community note',
    preferred: ['facebook', 'instagram', 'linkedin-page'],
    content: [
      'A quieter note for Sunday — the kind of post that used to get cut off mid-sentence in the calendar cell.',
      'We spent the week looking at how long, ordinary social copy behaves in week view: LinkedIn paragraphs, Mastodon threads with numbered beats, a demo script that is mostly stage directions. None of it is exotic. All of it is longer than a slogan.',
      'If you are QA-ing this build: open the posts panel, flip Scheduled ↔ Draft, then open one of the long cards in Create Post. The body in the editor should match what you glimpsed on the grid — including the line breaks and the hashtag block at the end.',
      'Thanks for reading all the way down. That was the point.',
      '#community #qa @northwind',
    ].join('</p><p>'),
  },
];

const prisma = new PrismaClient();

function mondayOfLocalWeek(d = new Date()) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  // getDay(): 0 Sun … 1 Mon … — shift so Monday is start.
  const dow = day.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  day.setDate(day.getDate() - back);
  return day;
}

function pickChannel(channels, preferred, index) {
  for (const id of preferred || []) {
    const hit = channels.find((c) => c.providerIdentifier === id);
    if (hit) return hit;
  }
  return channels[index % channels.length];
}

/** Past QUEUE slots seed as PUBLISHED so calendar chrome matches “already live”. */
function effectiveState(state, when) {
  if (state === 'QUEUE' && when.getTime() <= Date.now()) return 'PUBLISHED';
  return state;
}

async function main() {
  if (!orgId) {
    console.error('--org <id> is required.');
    process.exitCode = 2;
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) {
    console.error(`No organization ${orgId} on this database.`);
    process.exitCode = 2;
    return;
  }

  const where = { organizationId: orgId, group: { startsWith: GROUP } };

  if (revoke) {
    const { count } = dry
      ? { count: await prisma.post.count({ where }) }
      : await prisma.post.deleteMany({ where });
    console.log(`${dry ? '[dry] would delete' : 'deleted'} ${count} seeded post(s)`);
    return;
  }

  const channels = await prisma.integration.findMany({
    where: { organizationId: orgId, deletedAt: null, disabled: false },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      providerIdentifier: true,
      internalId: true,
    },
  });
  if (!channels.length) {
    console.error(
      'No channels on this organization. Run seed-dev-channel.mjs or ' +
        'seed-dev-workspace.mjs first — posts need a channel to attach to.'
    );
    process.exitCode = 2;
    return;
  }

  const already = await prisma.post.count({ where });
  if (already && !reset) {
    console.log(
      `${already} seeded post(s) already here — nothing to do. Re-run with --reset to replace them.`
    );
    return;
  }

  if (reset && already) {
    if (dry) {
      console.log(`[dry] would delete ${already} existing seeded post(s) before re-seed`);
    } else {
      const { count } = await prisma.post.deleteMany({ where });
      console.log(`reset: deleted ${count} seeded post(s)`);
    }
  }

  const weekStart = mondayOfLocalWeek();
  const rows = ROWS.map((row, i) => {
    const when = new Date(weekStart);
    when.setDate(weekStart.getDate() + row.dayOffset);
    when.setHours(row.hour, row.minute, 0, 0);
    const channel = pickChannel(channels, row.preferred, i);
    const state = effectiveState(row.state, when);
    return {
      when,
      state,
      title: row.title,
      content: `<p>${row.content}</p>`,
      channel,
      chars: row.content.replace(/<\/?p>/g, '').length,
    };
  });

  console.log(
    `${dry ? '[dry] would add' : 'adding'} ${rows.length} posts on ${org.name} ` +
      `(${channels.length} channel(s), week of ${weekStart.toISOString().slice(0, 10)}):`
  );
  for (const r of rows) {
    console.log(
      `  ${r.when.toISOString().slice(0, 16).replace('T', ' ')}  ${r.state.padEnd(6)}  ` +
        `${r.channel.providerIdentifier.padEnd(16)}  ${r.title}  (~${r.chars} chars)`
    );
  }
  if (dry) return;

  for (const r of rows) {
    await prisma.post.create({
      data: {
        organizationId: orgId,
        integrationId: r.channel.id,
        state: r.state,
        publishDate: r.when,
        content: r.content,
        title: r.title,
        // One group per post: the calendar treats a shared group as one post
        // split across channels, and these are separate posts.
        group: `${GROUP}-${r.when.getTime()}-${r.title.slice(0, 12)}`,
      },
    });
  }

  console.log(
    'done — calendar cells, posts panel and Create Post now have long bodies to judge'
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
