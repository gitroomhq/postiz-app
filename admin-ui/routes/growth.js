const express = require('express');
const { readWorkspaceData } = require('../db');
const { requirePermission } = require('./access');

const router = express.Router();
router.get('/recommendations', requirePermission('growth.view'), (_req, res) => {
  const data = readWorkspaceData();
  const latest = data.analyticsSnapshots.at(-1);
  const pending = data.approvals.filter((item) => item.status === 'pending').length;
  const connected = latest?.channels?.length || 0;
  const unavailable = latest?.channels?.filter((item) => item.error).length || 0;
  const recommendations = [
    { priority: 'high', title: 'Create a weekly content experiment', detail: 'Test one hook, visual style, or CTA at a time; compare reach and saves before repeating the winning format.' },
    { priority: pending ? 'high' : 'medium', title: pending ? `${pending} post approval${pending === 1 ? '' : 's'} need review` : 'Use an approval queue for client-facing content', detail: pending ? 'Review pending drafts before scheduling or publishing.' : 'Route branded posts through approval before publishing.' },
    { priority: unavailable ? 'medium' : 'low', title: unavailable ? 'Reconnect analytics permissions' : 'Review channel performance by platform', detail: unavailable ? `${unavailable} channel(s) did not return analytics. Check Meta permissions and account type.` : `${connected} connected channel(s) can be compared from the Analytics page.` },
    { priority: 'medium', title: 'Use human-approved community engagement', detail: 'Draft replies to comments and messages, then have a team member approve and send them. This builds real audience trust without automated follows, requests, or spam.' },
  ];
  res.json({ generatedAt: new Date().toISOString(), policy: 'Recommendations and draft replies require human approval. Automated follow requests, mass follows, and unfollows are not supported.', recommendations });
});
router.post('/campaign', requirePermission('ai.generate'), (req, res) => {
  const { topic, offer = '', audience = 'your ideal customers', area = '', language = 'Hinglish', objective = 'dm', campaignType = 'normal', adObjective = 'messages' } = req.body || {};
  const subject = String(topic || '').trim();
  if (!subject) return res.status(400).json({ error: 'Campaign topic is required.' });
  const offerText = String(offer || '').trim(); const location = String(area || '').trim();
  const objectives = {
    follow: { verb: 'Follow', action: 'Follow for weekly drops, ideas, and genuine offers.', keyword: 'FOLLOW' },
    like: { verb: 'Save and like', action: 'Save this post and like it if it helps you plan your next purchase.', keyword: 'SAVE' },
    subscribe: { verb: 'Subscribe', action: 'Subscribe for launch alerts and limited collection updates.', keyword: 'ALERT' },
    dm: { verb: 'DM us', action: `DM us “${offerText ? 'OFFER' : 'INFO'}” for the catalogue and a personal response.`, keyword: offerText ? 'OFFER' : 'INFO' },
  };
  const goal = objectives[objective] || objectives.dm;
  const caption = `${subject} deserves a closer look.${offerText ? ` ${offerText}.` : ''}${location ? ` Available for customers in ${location}.` : ''}\n\nMade for ${String(audience)}—clear details, real value, and no pressure.\n\n${goal.action}`;
  const isAdvertisement = campaignType === 'advertisement';
  const adObjectiveMap = {
    messages: { label: 'Messages', cta: 'Send Message', metric: 'Cost per messaging conversation' },
    leads: { label: 'Leads', cta: 'Get Quote', metric: 'Cost per lead' },
    traffic: { label: 'Traffic', cta: 'Learn More', metric: 'Landing-page views' },
    sales: { label: 'Sales', cta: 'Shop Now', metric: 'Purchases / conversion value' },
    awareness: { label: 'Awareness', cta: 'Learn More', metric: 'Reach and ad recall' },
  };
  const ad = adObjectiveMap[adObjective] || adObjectiveMap.messages;
  res.json({ campaignType: isAdvertisement ? 'advertisement' : 'normal', objective: objectives[objective] ? objective : 'dm', hook: `${goal.verb}: discover ${subject}.`, caption, cta: isAdvertisement ? ad.cta : goal.action, dmKeyword: goal.keyword,
    adCampaign: isAdvertisement ? {
      objective: ad.label,
      primaryText: caption,
      headline: `${subject}${offerText ? ` — ${offerText}` : ''}`.slice(0, 255),
      description: location ? `Available in ${location}. ${offerText}`.trim() : offerText || 'Discover details and availability.',
      callToAction: ad.cta,
      recommendedMetric: ad.metric,
      audience: String(audience),
      location: location || 'Set the service area in Meta Ads Manager',
      setupChecklist: ['Create the campaign in Meta Ads Manager using the listed objective.', 'Choose the connected Facebook Page and Instagram account.', 'Set a truthful offer, budget, duration, audience and location.', 'Upload the approved image/video; do not use misleading claims or prohibited targeting.', 'Review the ad in Meta Ads Manager and publish there.'],
    } : null,
    replyDraft: `Thanks for messaging us about ${subject}! We would be happy to help. Please share what you are looking for, your preferred budget/range, and ${location ? `your area in ${location}` : 'your city'} so our team can send the most relevant details.`,
    commentPrompt: `What would you like to know about ${subject}? Comment below or DM “${goal.keyword}” and our team will reply.`,
    checklist: ['Verify offer, price and stock claims before publishing.', 'Use the generated CTA once, naturally—not repeatedly.', 'Reply to inbound DMs personally or through an approved support workflow.', 'Review reach, saves, comments and DM inquiries after 48 hours.'], language: String(language || 'Hinglish') });
});
module.exports = router;
