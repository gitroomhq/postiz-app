const express = require('express');
const { readWorkspaceData, writeWorkspaceData } = require('../db');

const router = express.Router();
const GRAPH = (process.env.FACEBOOK_MARKETING_API_VERSION || 'v26.0').replace(/^\//, '');
const SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_ads',
  'pages_manage_metadata',
  'pages_manage_posts',
  'pages_read_user_content',
];
const DEFAULT_TENANT = '_workspace';

function graphUrl(path) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `https://graph.facebook.com/${GRAPH}${clean}`;
}

function publicUrl() {
  return (process.env.ADMIN_UI_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
}

function adsRedirectUri() {
  return process.env.FACEBOOK_ADS_REDIRECT_URI || `${publicUrl()}/api/facebook-ads/oauth/callback`;
}

function tenantIdFrom(req) {
  const raw = req.get('x-tenant-id') || req.query.tenantId || req.body?.tenantId || DEFAULT_TENANT;
  const id = String(raw || DEFAULT_TENANT).trim() || DEFAULT_TENANT;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(id)) {
    const error = new Error('Invalid tenant');
    error.status = 400;
    throw error;
  }
  return id;
}

function getConnection(tenantId) {
  const data = readWorkspaceData();
  return (data.facebookAdsConnections || {})[tenantId] || null;
}

function saveConnection(tenantId, connection) {
  const data = readWorkspaceData();
  data.facebookAdsConnections = data.facebookAdsConnections || {};
  if (connection) data.facebookAdsConnections[tenantId] = connection;
  else delete data.facebookAdsConnections[tenantId];
  writeWorkspaceData(data);
  return publicConnection(connection, tenantId);
}

function publicConnection(connection, tenantId) {
  if (!connection) return null;
  return {
    tenantId,
    facebookUserId: connection.facebookUserId,
    name: connection.name,
    selectedBusinessId: connection.selectedBusinessId || '',
    selectedAdAccountId: connection.selectedAdAccountId || '',
    tokenExpiration: connection.tokenExpiration || null,
    graphVersion: GRAPH,
  };
}

function actId(raw) {
  const id = String(raw || '').replace(/^act_/, '');
  if (!id) throw new Error('Select an ad account first');
  return `act_${id}`;
}

async function graphGet(token, path, params = {}) {
  const search = new URLSearchParams({ ...params, access_token: token });
  return readGraph(await fetch(`${graphUrl(path)}?${search}`));
}

async function resolvePageToken(userToken, pageId) {
  const pages = await collectAll(userToken, '/me/accounts', { fields: 'id,access_token' });
  const page = pages.find((item) => String(item.id) === String(pageId));
  return page?.access_token || userToken;
}

async function graphPost(token, path, body) {
  return readGraph(
    await fetch(graphUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: token }),
    })
  );
}

async function readGraph(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const err = payload.error || {};
    const error = new Error(err.error_user_msg || err.message || 'Facebook Marketing API request failed');
    error.status = 400;
    throw error;
  }
  return payload;
}

async function collectAll(token, path, params = {}) {
  const items = [];
  let next = `${graphUrl(path)}?${new URLSearchParams({ ...params, access_token: token, limit: '100' })}`;
  while (next) {
    const page = await readGraph(await fetch(next));
    if (page.data?.length) items.push(...page.data);
    next = page.paging?.next;
  }
  return items;
}

function requireToken(req) {
  const tenantId = tenantIdFrom(req);
  const connection = getConnection(tenantId);
  if (!connection?.accessToken) {
    const error = new Error('Connect a Facebook Business Manager for this brand first');
    error.status = 404;
    throw error;
  }
  connection._tenantId = tenantId;
  return connection;
}

router.get('/catalog', (_req, res) => {
  res.json({
    graphVersion: GRAPH,
    scopes: SCOPES,
    defaultTenantId: DEFAULT_TENANT,
    currency: 'INR',
    currencyOffset: 100,
    campaignObjectives: ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION'],
    optimizationGoalsByObjective: {
      OUTCOME_AWARENESS: ['REACH', 'IMPRESSIONS', 'AD_RECALL_LIFT'],
      OUTCOME_TRAFFIC: ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'REACH'],
      OUTCOME_ENGAGEMENT: ['POST_ENGAGEMENT', 'PAGE_LIKES', 'THRUPLAY', 'CONVERSATIONS', 'PROFILE_VISIT', 'PROFILE_AND_PAGE_ENGAGEMENT'],
      OUTCOME_LEADS: ['LEAD_GENERATION', 'QUALITY_LEAD', 'CONVERSATIONS'],
      OUTCOME_SALES: ['OFFSITE_CONVERSIONS', 'VALUE', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS'],
      OUTCOME_APP_PROMOTION: ['LINK_CLICKS', 'OFFSITE_CONVERSIONS', 'VALUE'],
    },
    optimizationGoals: ['REACH', 'IMPRESSIONS', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'POST_ENGAGEMENT', 'PAGE_LIKES', 'LEAD_GENERATION', 'QUALITY_LEAD', 'OFFSITE_CONVERSIONS', 'VALUE', 'CONVERSATIONS', 'THRUPLAY', 'AD_RECALL_LIFT', 'PROFILE_VISIT', 'PROFILE_AND_PAGE_ENGAGEMENT', 'AUTOMATIC_OBJECTIVE'],
    bidStrategies: ['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS'],
    destinationTypes: ['WEBSITE', 'ON_AD', 'ON_POST', 'ON_PAGE', 'MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT', 'FACEBOOK', 'APP', 'APPLINKS_AUTOMATIC'],
    billingEvents: ['IMPRESSIONS', 'LINK_CLICKS', 'THRUPLAY', 'POST_ENGAGEMENT', 'PAGE_LIKES'],
    genders: [
      { id: 0, label: 'All' },
      { id: 1, label: 'Male' },
      { id: 2, label: 'Female' },
    ],
  });
});

router.get('/status', (req, res, next) => {
  try {
    const tenantId = tenantIdFrom(req);
    const connection = getConnection(tenantId);
    res.json({ tenantId, connected: !!connection?.accessToken, graphVersion: GRAPH, connection: publicConnection(connection, tenantId) });
  } catch (error) { next(error); }
});

router.get('/auth-url', (req, res, next) => {
  try {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return res.status(400).json({ error: 'FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set' });
    }
    const tenantId = tenantIdFrom(req);
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: adsRedirectUri(),
      state: `admin-ui-ads:${tenantId}`,
      scope: SCOPES.join(','),
      response_type: 'code',
    });
    res.json({ url: `https://www.facebook.com/${GRAPH}/dialog/oauth?${params}`, tenantId });
  } catch (error) { next(error); }
});

router.get('/oauth/callback', async (req, res) => {
  const state = String(req.query.state || '');
  const tenantId = state.startsWith('admin-ui-ads:') ? state.slice('admin-ui-ads:'.length) : DEFAULT_TENANT;
  try {
    const code = req.query.code;
    if (!code) throw new Error(req.query.error_description || 'Facebook did not return a code');
    const token = await readGraph(
      await fetch(
        graphUrl('/oauth/access_token') +
          `?client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID)}` +
          `&redirect_uri=${encodeURIComponent(adsRedirectUri())}` +
          `&client_secret=${encodeURIComponent(process.env.FACEBOOK_APP_SECRET)}` +
          `&code=${encodeURIComponent(String(code))}`
      )
    );
    const longLived = await readGraph(
      await fetch(
        graphUrl('/oauth/access_token') +
          `?grant_type=fb_exchange_token&client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID)}` +
          `&client_secret=${encodeURIComponent(process.env.FACEBOOK_APP_SECRET)}` +
          `&fb_exchange_token=${encodeURIComponent(token.access_token)}`
      )
    ).catch(() => token);
    const accessToken = longLived.access_token || token.access_token;
    const me = await graphGet(accessToken, '/me', { fields: 'id,name' });
    saveConnection(tenantId, {
      facebookUserId: me.id,
      name: me.name,
      accessToken,
      tokenExpiration: new Date(Date.now() + (longLived.expires_in || 5097600) * 1000).toISOString(),
    });
    res.redirect(`/facebook-ads?tenant=${encodeURIComponent(tenantId)}`);
  } catch (error) {
    res.redirect(`/facebook-ads?tenant=${encodeURIComponent(tenantId)}&error=${encodeURIComponent(error.message)}`);
  }
});

router.get('/businesses', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    res.json({ businesses: await collectAll(accessToken, '/me/businesses', { fields: 'id,name' }) });
  } catch (error) { next(error); }
});

router.get('/ad-accounts', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    const businessId = req.query.businessId;
    if (businessId) {
      const [owned, clientAccounts] = await Promise.all([
        collectAll(accessToken, `/${businessId}/owned_ad_accounts`, { fields: 'id,name,account_id,currency,account_status' }),
        collectAll(accessToken, `/${businessId}/client_ad_accounts`, { fields: 'id,name,account_id,currency,account_status' }),
      ]);
      return res.json({ adAccounts: [...owned, ...clientAccounts] });
    }
    res.json({ adAccounts: await collectAll(accessToken, '/me/adaccounts', { fields: 'id,name,account_id,currency,account_status,business' }) });
  } catch (error) { next(error); }
});

router.post('/select', (req, res, next) => {
  try {
    const connection = requireToken(req);
    const tenantId = connection._tenantId;
    connection.selectedBusinessId = req.body.businessId || '';
    connection.selectedAdAccountId = actId(req.body.adAccountId);
    delete connection._tenantId;
    res.json(saveConnection(tenantId, connection));
  } catch (error) { next(error); }
});

router.get('/pages', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    const pages = await collectAll(accessToken, '/me/accounts', { fields: 'id,name,access_token' });
    res.json({
      pages: pages.map((page) => ({
        id: page.id,
        name: page.name,
        hasPageToken: !!page.access_token,
      })),
    });
  } catch (error) { next(error); }
});

router.get('/pages/:pageId/posts', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    const pageId = String(req.params.pageId || '').trim();
    if (!pageId) {
      const error = new Error('Select a Facebook Page first');
      error.status = 400;
      throw error;
    }
    const pages = await collectAll(accessToken, '/me/accounts', { fields: 'id,name,access_token,tasks' });
    const page = pages.find((item) => String(item.id) === pageId);
    if (!page?.access_token) {
      const error = new Error('No Page access token for this Page. Click Reconnect and approve Page permissions.');
      error.status = 400;
      throw error;
    }
    const token = page.access_token;
    const fields = 'id,message,story,created_time,permalink_url,full_picture,is_published,status_type,attachments{media_type,url,media,title,description}';
    const edges = [
      { edge: 'promotable_posts', params: { fields, limit: '40', include_inline: 'true' } },
      { edge: 'published_posts', params: { fields, limit: '40' } },
      { edge: 'feed', params: { fields, limit: '40' } },
      { edge: 'posts', params: { fields, limit: '40' } },
      { edge: 'ads_posts', params: { fields, limit: '25' } },
    ];
    const byId = new Map();
    const errors = [];
    for (const item of edges) {
      try {
        const batch = await collectAll(token, '/' + pageId + '/' + item.edge, item.params);
        for (const post of batch || []) {
          if (!post?.id) continue;
          if (!byId.has(post.id)) byId.set(post.id, Object.assign({}, post, { _edge: item.edge }));
        }
      } catch (err) {
        errors.push(item.edge + ': ' + (err.message || String(err)));
      }
    }
    let posts = Array.from(byId.values());
    posts.sort((a, b) => String(b.created_time || '').localeCompare(String(a.created_time || '')));
    res.json({
      pageId,
      pageName: page.name || '',
      usedPageToken: true,
      sourceErrors: errors,
      posts: posts.slice(0, 50).map((post) => {
        let id = String(post.id);
        if (pageId && id.indexOf('_') < 0) id = pageId + '_' + id;
        const att = post.attachments && post.attachments.data && post.attachments.data[0];
        return {
          id,
          message: post.message || post.story || (att && att.title) || '(no text)',
          createdTime: post.created_time || null,
          permalinkUrl: post.permalink_url || '',
          picture: post.full_picture || (att && att.media && att.media.image && att.media.image.src) || '',
          statusType: post.status_type || '',
          isPublished: post.is_published !== false,
          source: post._edge || '',
        };
      }),
    });
  } catch (error) { next(error); }
});


router.get('/pages/:pageId/lead-forms', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    const pageId = String(req.params.pageId || '').trim();
    if (!pageId) {
      const error = new Error('Select a Facebook Page first');
      error.status = 400;
      throw error;
    }
    const pageToken = await resolvePageToken(accessToken, pageId);
    const forms = await collectAll(pageToken, '/' + pageId + '/leadgen_forms', {
      fields: 'id,name,status,leads_count,created_time',
      limit: '50',
    });
    res.json({
      forms: (forms || []).map((form) => ({
        id: form.id,
        name: form.name,
        status: form.status,
        leadsCount: form.leads_count,
        createdTime: form.created_time,
      })),
    });
  } catch (error) { next(error); }
});

router.post('/pages/:pageId/lead-forms', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    const pageId = String(req.params.pageId || '').trim();
    if (!pageId) {
      const error = new Error('Select a Facebook Page first');
      error.status = 400;
      throw error;
    }
    const name = String(req.body.name || 'Instant Form').trim() || 'Instant Form';
    const privacyUrl = String(req.body.privacyPolicyUrl || '').trim();
    if (!privacyUrl) {
      const error = new Error('Enter a real privacy policy URL (https://...). Placeholders are ignored.');
      error.status = 400;
      throw error;
    }
    const pageToken = await resolvePageToken(accessToken, pageId);
    const questions = [
      { type: 'FULL_NAME' },
      { type: 'EMAIL' },
      { type: 'PHONE' },
    ];
    const body = {
      name,
      questions: JSON.stringify(questions),
      privacy_policy: JSON.stringify({ url: privacyUrl, link_text: 'Privacy Policy' }),
      thank_you_page: JSON.stringify({
        title: 'Thanks',
        body: 'We will contact you soon.',
        button_type: 'VIEW_WEBSITE',
        website_url: privacyUrl,
        button_text: 'OK',
      }),
    };
    const created = await graphPost(pageToken, '/' + pageId + '/leadgen_forms', body);
    res.json(created);
  } catch (error) { next(error); }
});

router.get('/targeting/geo', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ locations: [] });
    const locationTypes = String(req.query.type || 'city,region').split(',').map((v) => v.trim()).filter(Boolean);
    const data = await graphGet(accessToken, '/search', {
      type: 'adgeolocation',
      q,
      location_types: JSON.stringify(locationTypes),
      limit: '20',
    });
    res.json({
      locations: (data.data || []).map((item) => ({
        key: item.key,
        name: item.name,
        type: item.type,
        countryCode: item.country_code,
        region: item.region,
        regionId: item.region_id,
      })),
    });
  } catch (error) { next(error); }
});

router.get('/targeting/interests', async (req, res, next) => {
  try {
    const { accessToken } = requireToken(req);
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ interests: [] });
    const data = await graphGet(accessToken, '/search', {
      type: 'adinterest',
      q,
      limit: '25',
    });
    res.json({
      interests: (data.data || []).map((item) => ({
        id: item.id,
        name: item.name,
        audienceSize: item.audience_size || item.audience_size_lower_bound || null,
      })),
    });
  } catch (error) { next(error); }
});

router.get('/audiences', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const path = '/' + actId(connection.selectedAdAccountId) + '/customaudiences';
    const audiences = await collectAll(connection.accessToken, path, {
      fields: 'id,name,subtype,approximate_count,delivery_status',
    });
    res.json({
      audiences: audiences.map((item) => ({
        id: item.id,
        name: item.name,
        subtype: item.subtype || '',
        size: item.approximate_count || null,
      })),
    });
  } catch (error) { next(error); }
});

router.get('/campaigns', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const path = '/' + actId(connection.selectedAdAccountId) + '/campaigns';
    res.json({ campaigns: await collectAll(connection.accessToken, path, { fields: 'id,name,objective,status,effective_status,created_time,updated_time' }) });
  } catch (error) { next(error); }
});

router.post('/campaigns', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const path = '/' + actId(connection.selectedAdAccountId) + '/campaigns';
    const created = await graphPost(connection.accessToken, path, {
      name: req.body.name,
      objective: req.body.objective || 'OUTCOME_TRAFFIC',
      status: req.body.status || 'PAUSED',
      special_ad_categories: [],
      // Required by Marketing API when not using campaign budget optimization (CBO).
      // false = each ad set keeps its own daily/lifetime budget.
      is_adset_budget_sharing_enabled: false,
    });
    res.json(created);
  } catch (error) { next(error); }
});

router.get('/ad-groups', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const path = '/' + actId(connection.selectedAdAccountId) + '/adsets';
    res.json({ adGroups: await collectAll(connection.accessToken, path, { fields: 'id,name,campaign_id,status,effective_status,optimization_goal,bid_strategy,destination_type,billing_event,daily_budget,lifetime_budget,start_time,end_time,targeting' }) });
  } catch (error) { next(error); }
});

router.post('/ad-groups', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const path = '/' + actId(connection.selectedAdAccountId) + '/adsets';
    const currencyOffset = Math.max(1, Number(req.body.currencyOffset || 100));
    // Ad sets require a budget. Prefer explicit INR; otherwise use a temporary minimum
    // that the Ad create step can overwrite with the user-facing ad budget.
    const dailyBudgetInr = Number(
      req.body.dailyBudgetInr != null && req.body.dailyBudgetInr !== ''
        ? req.body.dailyBudgetInr
        : (req.body.dailyBudget != null && req.body.dailyBudget !== '' ? req.body.dailyBudget : 100)
    );
    if (!Number.isFinite(dailyBudgetInr) || dailyBudgetInr <= 0) {
      const error = new Error('Enter a daily budget in INR');
      error.status = 400;
      throw error;
    }

    const countries = Array.isArray(req.body.countries) && req.body.countries.length
      ? req.body.countries.map((c) => String(c).toUpperCase())
      : [String(req.body.country || 'IN').toUpperCase()];

    const rawCities = Array.isArray(req.body.cities)
      ? req.body.cities
          .map((city) => ({
            key: String(city.key || city.id || ''),
            name: city.name || '',
            radius: Number(city.radius || req.body.areaRadius || 25),
          }))
          .filter((city) => city.key)
      : [];
    // Multiple cities with radius often conflict when areas overlap (Meta: "Remove a conflicting location").
    // Use radius only for a single city; for several cities send keys only.
    const cities = rawCities.map((city) => {
      if (rawCities.length === 1) {
        const radius = Math.min(80, Math.max(17, Number.isFinite(city.radius) ? city.radius : 25));
        return { key: city.key, radius, distance_unit: 'kilometer' };
      }
      return { key: city.key };
    });

    const regions = Array.isArray(req.body.regions)
      ? req.body.regions.map((region) => ({ key: String(region.key || region.id || '') })).filter((region) => region.key)
      : [];

    const interests = Array.isArray(req.body.interests)
      ? req.body.interests.map((interest) => ({ id: String(interest.id), name: interest.name || undefined })).filter((interest) => interest.id)
      : [];

    const customAudiences = Array.isArray(req.body.customAudiences)
      ? req.body.customAudiences.map((audience) => ({ id: String(audience.id || audience) })).filter((audience) => audience.id)
      : [];

    // Meta rejects country + city/region combinations as "conflicting location".
    // If the user picked cities/regions, send only those. Otherwise fall back to country.
    const geo_locations = {};
    if (cities.length || regions.length) {
      if (cities.length) geo_locations.cities = cities;
      if (regions.length) geo_locations.regions = regions;
    } else {
      geo_locations.countries = countries;
    }

    const advantageAudienceRaw = req.body.advantageAudience;
    const advantageAudience =
      advantageAudienceRaw === false ||
      advantageAudienceRaw === 0 ||
      advantageAudienceRaw === '0' ||
      String(advantageAudienceRaw).toLowerCase() === 'false'
        ? 0
        : 1;

    const advantagePlacementsRaw = req.body.advantagePlacements;
    const advantagePlacements = !(
      advantagePlacementsRaw === false ||
      advantagePlacementsRaw === 0 ||
      advantagePlacementsRaw === '0' ||
      String(advantagePlacementsRaw).toLowerCase() === 'false'
    );

    const targeting = {
      geo_locations,
      targeting_automation: {
        advantage_audience: advantageAudience,
      },
    };

    if (!advantagePlacements) {
      targeting.publisher_platforms = ['facebook', 'instagram', 'audience_network', 'messenger'];
    }

    const ageMin = Number(req.body.ageMin || 18);
    const ageMax = Number(req.body.ageMax || 65);
    if (Number.isFinite(ageMin)) targeting.age_min = Math.max(13, Math.min(65, ageMin));
    if (Number.isFinite(ageMax)) targeting.age_max = Math.max(targeting.age_min || 18, Math.min(65, ageMax));

    const gender = Number(req.body.gender);
    if (gender === 1 || gender === 2) targeting.genders = [gender];

    if (interests.length) targeting.flexible_spec = [{ interests }];
    if (customAudiences.length) targeting.custom_audiences = customAudiences;

    const payload = {
      name: req.body.name,
      campaign_id: req.body.campaignId,
      billing_event: req.body.billingEvent || 'IMPRESSIONS',
      optimization_goal: req.body.optimizationGoal,
      bid_strategy: req.body.bidStrategy,
      destination_type: req.body.destinationType,
      daily_budget: Math.round(dailyBudgetInr * currencyOffset),
      targeting: JSON.stringify(targeting),
      status: req.body.status || 'PAUSED',
      start_time: new Date().toISOString(),
    };

    if (req.body.bidAmountInr && (req.body.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' || req.body.bidStrategy === 'COST_CAP')) {
      payload.bid_amount = Math.round(Number(req.body.bidAmountInr) * currencyOffset);
    }

    let pageId = String(req.body.pageId || req.body.promotedPageId || '').trim();
    const pixelId = String(req.body.pixelId || '').trim();
    let leadFormId = String(req.body.leadGenFormId || '').trim();
    const optimization = String(req.body.optimizationGoal || '').toUpperCase();
    const destination = String(req.body.destinationType || '').toUpperCase();
    const needsPage =
      ['LEAD_GENERATION', 'QUALITY_LEAD', 'PAGE_LIKES', 'POST_ENGAGEMENT', 'CONVERSATIONS', 'PROFILE_VISIT', 'PROFILE_AND_PAGE_ENGAGEMENT'].includes(optimization) ||
      ['ON_AD', 'ON_PAGE', 'ON_POST', 'MESSENGER', 'INSTAGRAM_DIRECT'].includes(destination);

    const wantsLeadForm =
      ['LEAD_GENERATION', 'QUALITY_LEAD'].includes(optimization) || destination === 'ON_AD';
    const autoCreateLeadForm =
      req.body.autoCreateLeadForm === true ||
      req.body.autoCreateLeadForm === 1 ||
      req.body.autoCreateLeadForm === '1' ||
      String(req.body.autoCreateLeadForm).toLowerCase() === 'true';

    if (wantsLeadForm && !leadFormId && autoCreateLeadForm) {
      if (!pageId) {
        const error = new Error('Select a Facebook Page before auto-creating an Instant Form');
        error.status = 400;
        throw error;
      }
      const privacyUrl = String(req.body.privacyPolicyUrl || '').trim();
      if (!privacyUrl || !/^https?:\/\//i.test(privacyUrl)) {
        const error = new Error('Auto Instant Form needs a real https privacy URL (Step 4), or uncheck Auto-create Instant Form.');
        error.status = 400;
        throw error;
      }
      const pageToken = await resolvePageToken(connection.accessToken, pageId);
      const formName = String(req.body.leadFormName || (req.body.name ? req.body.name + ' form' : 'Instant Form')).trim();
      const createdForm = await graphPost(pageToken, '/' + pageId + '/leadgen_forms', {
        name: formName || 'Instant Form',
        questions: JSON.stringify([{ type: 'FULL_NAME' }, { type: 'EMAIL' }, { type: 'PHONE' }]),
        privacy_policy: JSON.stringify({ url: privacyUrl, link_text: 'Privacy Policy' }),
        thank_you_page: JSON.stringify({
          title: 'Thanks',
          body: 'We will contact you soon.',
          button_type: 'VIEW_WEBSITE',
          website_url: privacyUrl,
          button_text: 'OK',
        }),
      });
      leadFormId = String(createdForm.id || '');
    }

    // Meta rejects lead_gen_form_id inside ad-set promoted_object for many Lead setups.
    // Keep page_id (and optional pixel) on the ad set; attach the Instant Form on the Ad creative.
    if (needsPage || pixelId) {
      const promoted = {};
      if (pageId) promoted.page_id = pageId;
      if (pixelId) promoted.pixel_id = pixelId;
      if (!promoted.page_id && needsPage) {
        const error = new Error('Select a Facebook Page as the promoted object for this ad group');
        error.status = 400;
        throw error;
      }
      if (Object.keys(promoted).length) payload.promoted_object = promoted;
    }

    const created = await graphPost(connection.accessToken, path, payload);
    res.json({
      ...created,
      lead_gen_form_id: leadFormId || undefined,
      page_id: pageId || undefined,
    });
  } catch (error) { next(error); }
});

router.get('/ads', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const path = '/' + actId(connection.selectedAdAccountId) + '/ads';
    res.json({ ads: await collectAll(connection.accessToken, path, { fields: 'id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time' }) });
  } catch (error) { next(error); }
});

router.post('/ads', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const account = actId(connection.selectedAdAccountId);
    const creativeSource = String(req.body.creativeSource || '').trim().toLowerCase();
    const objectStoryId = String(req.body.objectStoryId || req.body.postId || '').trim();
    const leadFormId = String(req.body.leadGenFormId || '').trim();
    const useExistingPost = creativeSource === 'existing_post' || creativeSource === 'existing';
    const useInstantForm = creativeSource === 'instant_form' || creativeSource === 'lead_form';
    // new_creative / new = link creative without Instant Form CTA

    let creative;
    if (useExistingPost) {
      if (!objectStoryId) {
        const error = new Error('Select a Page post to promote');
        error.status = 400;
        throw error;
      }
      // Normalize to pageId_postId when needed.
      let storyId = objectStoryId;
      const pageIdForStory = String(req.body.pageId || '').trim();
      if (pageIdForStory && !storyId.includes('_')) {
        storyId = pageIdForStory + '_' + storyId;
      }
      const creativeBody = {
        name: req.body.name + ' creative',
        object_story_id: storyId,
      };
      // Lead campaigns: attach Instant Form CTA onto the existing-post creative when provided.
      if (leadFormId) {
        creativeBody.call_to_action = {
          type: 'SIGN_UP',
          value: { lead_gen_form_id: leadFormId },
        };
      }
      try {
        creative = await graphPost(connection.accessToken, '/' + account + '/adcreatives', creativeBody);
      } catch (err) {
        // Meta sometimes rejects CTA with object_story_id — retry post-only, then caller can still run Traffic ads.
        const msg = String(err.message || err);
        if (leadFormId && /call_to_action|lead_gen_form|invalid/i.test(msg)) {
          creative = await graphPost(connection.accessToken, '/' + account + '/adcreatives', {
            name: req.body.name + ' creative',
            object_story_id: storyId,
          });
        } else {
          throw err;
        }
      }
    } else if (useInstantForm) {
      if (!req.body.pageId) {
        const error = new Error('Select a Facebook Page');
        error.status = 400;
        throw error;
      }
      if (!leadFormId) {
        const error = new Error('Select or auto-create an Instant Form for this lead ad');
        error.status = 400;
        throw error;
      }
      if (!req.body.message) {
        const error = new Error('Primary text is required for an Instant Form ad');
        error.status = 400;
        throw error;
      }
      const link = String(req.body.link || 'https://fb.me/').trim() || 'https://fb.me/';
      const linkData = {
        link,
        message: req.body.message,
        call_to_action: {
          type: 'SIGN_UP',
          value: { lead_gen_form_id: leadFormId },
        },
      };
      if (req.body.headline) linkData.name = req.body.headline;
      if (req.body.description) linkData.description = req.body.description;
      if (req.body.imageUrl) {
        const uploaded = await graphPost(connection.accessToken, '/' + account + '/adimages', { url: req.body.imageUrl });
        const hash = Object.values(uploaded.images || {})[0]?.hash;
        if (hash) linkData.image_hash = hash;
        else linkData.picture = req.body.imageUrl;
      }
      creative = await graphPost(connection.accessToken, '/' + account + '/adcreatives', {
        name: req.body.name + ' creative',
        object_story_spec: { page_id: req.body.pageId, link_data: linkData },
      });
    } else {
      if (!req.body.pageId) {
        const error = new Error('Select a Facebook Page');
        error.status = 400;
        throw error;
      }
      if (!req.body.message || !req.body.link) {
        const error = new Error('Primary text and destination URL are required for a new creative');
        error.status = 400;
        throw error;
      }
      const linkData = { link: req.body.link, message: req.body.message };
      if (req.body.headline) linkData.name = req.body.headline;
      if (req.body.description) linkData.description = req.body.description;
      if (req.body.imageUrl) {
        const uploaded = await graphPost(connection.accessToken, '/' + account + '/adimages', { url: req.body.imageUrl });
        const hash = Object.values(uploaded.images || {})[0]?.hash;
        if (hash) linkData.image_hash = hash;
        else linkData.picture = req.body.imageUrl;
      }
      creative = await graphPost(connection.accessToken, '/' + account + '/adcreatives', {
        name: req.body.name + ' creative',
        object_story_spec: { page_id: req.body.pageId, link_data: linkData },
      });
    }

    const adsetId = String(req.body.adGroupId || '').trim();
    if (!adsetId) {
      const error = new Error('Select an ad group first');
      error.status = 400;
      throw error;
    }

    // Meta does not support daily_budget on the Ad object. Apply the user-facing
    // "ad budget" to the parent ad set so spend is controlled from the Ad step.
    const currencyOffset = Math.max(1, Number(req.body.currencyOffset || 100));
    const dailyBudgetInr = Number(req.body.dailyBudgetInr);
    if (Number.isFinite(dailyBudgetInr) && dailyBudgetInr > 0) {
      await graphPost(connection.accessToken, '/' + adsetId, {
        daily_budget: Math.round(dailyBudgetInr * currencyOffset),
      });
    }

    const ad = await graphPost(connection.accessToken, '/' + account + '/ads', {
      name: req.body.name,
      adset_id: adsetId,
      creative: { creative_id: creative.id },
      status: req.body.status || 'PAUSED',
    });
    res.json({
      ...ad,
      creative_id: creative.id,
      object_story_id: useExistingPost ? objectStoryId : undefined,
      adset_daily_budget_inr: Number.isFinite(dailyBudgetInr) && dailyBudgetInr > 0 ? dailyBudgetInr : undefined,
    });
  } catch (error) { next(error); }
});


function normalizeStatus(raw) {
  const value = String(raw || '').trim().toUpperCase();
  if (value === 'START' || value === 'ACTIVE' || value === 'RESUME') return 'ACTIVE';
  if (value === 'PAUSE' || value === 'PAUSED') return 'PAUSED';
  if (value === 'STOP' || value === 'STOPPED' || value === 'ARCHIVE' || value === 'ARCHIVED') return 'ARCHIVED';
  const error = new Error('Status must be start, pause, or stop');
  error.status = 400;
  throw error;
}

async function updateObjectStatus(req, res, next) {
  try {
    const connection = requireToken(req);
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Missing Facebook object id');
      error.status = 400;
      throw error;
    }
    const status = normalizeStatus(req.body?.status || req.body?.action);
    const updated = await graphPost(connection.accessToken, '/' + id, { status });
    res.json({ id, status, result: updated });
  } catch (error) { next(error); }
}


router.post('/campaigns/:id', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Missing campaign id');
      error.status = 400;
      throw error;
    }
    const payload = {};
    if (req.body.name) payload.name = String(req.body.name).trim();
    if (req.body.status) payload.status = normalizeStatus(req.body.status);
    if (!Object.keys(payload).length) {
      const error = new Error('Nothing to update');
      error.status = 400;
      throw error;
    }
    res.json(await graphPost(connection.accessToken, '/' + id, payload));
  } catch (error) { next(error); }
});

router.post('/ad-groups/:id', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Missing ad group id');
      error.status = 400;
      throw error;
    }
    const currencyOffset = Math.max(1, Number(req.body.currencyOffset || 100));
    const payload = {};
    if (req.body.name) payload.name = String(req.body.name).trim();
    if (req.body.status) payload.status = normalizeStatus(req.body.status);

    const dailyBudgetInr = Number(req.body.dailyBudgetInr);
    if (Number.isFinite(dailyBudgetInr) && dailyBudgetInr > 0) {
      payload.daily_budget = Math.round(dailyBudgetInr * currencyOffset);
    }
    if (req.body.startTime) payload.start_time = String(req.body.startTime);
    if (req.body.endTime) payload.end_time = String(req.body.endTime);

    const hasGeo =
      req.body.country != null ||
      req.body.countries != null ||
      Array.isArray(req.body.cities) ||
      Array.isArray(req.body.regions);

    if (hasGeo) {
      const countries = Array.isArray(req.body.countries) && req.body.countries.length
        ? req.body.countries.map((c) => String(c).toUpperCase())
        : [String(req.body.country || 'IN').toUpperCase()];
      const rawCities = Array.isArray(req.body.cities)
        ? req.body.cities
            .map((city) => ({
              key: String(city.key || city.id || ''),
              name: city.name || '',
              radius: Number(city.radius || req.body.areaRadius || 25),
            }))
            .filter((city) => city.key)
        : [];
      const cities = rawCities.map((city) => {
        if (rawCities.length === 1) {
          const radius = Math.min(80, Math.max(17, Number.isFinite(city.radius) ? city.radius : 25));
          return { key: city.key, radius, distance_unit: 'kilometer' };
        }
        return { key: city.key };
      });
      const regions = Array.isArray(req.body.regions)
        ? req.body.regions.map((region) => ({ key: String(region.key || region.id || '') })).filter((region) => region.key)
        : [];
      const geo_locations = {};
      if (cities.length || regions.length) {
        if (cities.length) geo_locations.cities = cities;
        if (regions.length) geo_locations.regions = regions;
      } else {
        geo_locations.countries = countries;
      }

      const advantageAudienceRaw = req.body.advantageAudience;
      const advantageAudience =
        advantageAudienceRaw === false ||
        advantageAudienceRaw === 0 ||
        advantageAudienceRaw === '0' ||
        String(advantageAudienceRaw).toLowerCase() === 'false'
          ? 0
          : 1;

      payload.targeting = JSON.stringify({
        geo_locations,
        targeting_automation: { advantage_audience: advantageAudience },
      });
    }

    if (!Object.keys(payload).length) {
      const error = new Error('Nothing to update on ad group');
      error.status = 400;
      throw error;
    }
    res.json(await graphPost(connection.accessToken, '/' + id, payload));
  } catch (error) { next(error); }
});

router.post('/ads/:id', async (req, res, next) => {
  try {
    const connection = requireToken(req);
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Missing ad id');
      error.status = 400;
      throw error;
    }
    const payload = {};
    if (req.body.name) payload.name = String(req.body.name).trim();
    if (req.body.status) payload.status = normalizeStatus(req.body.status);
    if (!Object.keys(payload).length) {
      const error = new Error('Nothing to update');
      error.status = 400;
      throw error;
    }
    res.json(await graphPost(connection.accessToken, '/' + id, payload));
  } catch (error) { next(error); }
});


router.post('/campaigns/:id/status', updateObjectStatus);
router.post('/ad-groups/:id/status', updateObjectStatus);
router.post('/ads/:id/status', updateObjectStatus);

router.use((error, _req, res, _next) => {
  res.status(error.status || 400).json({ error: error.message });
});

module.exports = router;
