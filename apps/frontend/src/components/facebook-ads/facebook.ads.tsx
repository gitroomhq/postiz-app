'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

type CatalogOption = { value: string; label: string; field?: string };
type Catalog = {
  graphVersion: string;
  scopes: string[];
  campaignObjectives: CatalogOption[];
  optimizationGoals: CatalogOption[];
  bidStrategies: CatalogOption[];
  destinationTypes: CatalogOption[];
  billingEvents: CatalogOption[];
};

export const FacebookAds = () => {
  const fetchApi = useFetch();
  const request = useCallback(async (path: string, options?: RequestInit) => {
    const response = await fetchApi(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }
    return data;
  }, [fetchApi]);

  const [catalog, setCatalog] = useState<Catalog>();
  const [status, setStatus] = useState<any>();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adGroups, setAdGroups] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
  });
  const [adGroupForm, setAdGroupForm] = useState({
    name: '',
    campaignId: '',
    optimizationGoal: 'LINK_CLICKS',
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
    destinationType: 'WEBSITE',
    billingEvent: 'IMPRESSIONS',
    dailyBudget: '1000',
    country: 'IN',
    bidAmount: '',
    status: 'PAUSED',
  });
  const [adForm, setAdForm] = useState({
    name: '',
    adGroupId: '',
    pageId: '',
    message: '',
    link: '',
    headline: '',
    description: '',
    imageUrl: '',
    status: 'PAUSED',
  });

  const connected = !!status?.connected;
  const selectedAccount = status?.connection?.selectedAdAccountId;
  const needsBidAmount =
    adGroupForm.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' ||
    adGroupForm.bidStrategy === 'COST_CAP';

  const loadStatus = async () => {
    const next = await request('/facebook-ads/status');
    setStatus(next);
    setBusinessId(next.connection?.selectedBusinessId || '');
    setAdAccountId(next.connection?.selectedAdAccountId || '');
    return next;
  };

  const refreshLists = async () => {
    const [pageData, campaignData, groupData, adData] = await Promise.all([
      request('/facebook-ads/pages'),
      request('/facebook-ads/campaigns'),
      request('/facebook-ads/ad-groups'),
      request('/facebook-ads/ads'),
    ]);
    setPages(pageData.pages || []);
    setCampaigns(campaignData.campaigns || []);
    setAdGroups(groupData.adGroups || []);
    setAds(adData.ads || []);
    setAdGroupForm((old) => ({
      ...old,
      campaignId: old.campaignId || campaignData.campaigns?.[0]?.id || '',
    }));
    setAdForm((old) => ({
      ...old,
      adGroupId: old.adGroupId || groupData.adGroups?.[0]?.id || '',
      pageId: old.pageId || pageData.pages?.[0]?.id || '',
    }));
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const [nextCatalog, nextStatus] = await Promise.all([
          request('/facebook-ads/catalog'),
          loadStatus(),
        ]);
        setCatalog(nextCatalog);
        if (nextStatus.connected) {
          const biz = await request('/facebook-ads/businesses');
          setBusinesses(biz.businesses || []);
          const accounts = await request(
            `/facebook-ads/ad-accounts${
              nextStatus.connection?.selectedBusinessId
                ? `?businessId=${encodeURIComponent(nextStatus.connection.selectedBusinessId)}`
                : ''
            }`
          );
          setAdAccounts(accounts.adAccounts || []);
          if (nextStatus.connection?.selectedAdAccountId) {
            await refreshLists();
          }
        }
      } catch (e: any) {
        setError(e.message);
      }
    };
    boot();
  }, []);

  const connect = async () => {
    setError('');
    try {
      const { url } = await request('/facebook-ads/auth-url');
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
    }
  };

  const loadAccounts = async (id: string) => {
    setBusinessId(id);
    setError('');
    try {
      const accounts = await request(
        `/facebook-ads/ad-accounts${id ? `?businessId=${encodeURIComponent(id)}` : ''}`
      );
      setAdAccounts(accounts.adAccounts || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const saveContext = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy('select');
    try {
      await request('/facebook-ads/select', {
        method: 'POST',
        body: JSON.stringify({ businessId, adAccountId }),
      });
      await loadStatus();
      await refreshLists();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const createCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy('campaign');
    try {
      const created = await request('/facebook-ads/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignForm),
      });
      await refreshLists();
      setAdGroupForm((old) => ({ ...old, campaignId: created.id || old.campaignId }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const createAdGroup = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy('ad-group');
    try {
      const created = await request('/facebook-ads/ad-groups', {
        method: 'POST',
        body: JSON.stringify({
          name: adGroupForm.name,
          campaignId: adGroupForm.campaignId,
          optimizationGoal: adGroupForm.optimizationGoal,
          bidStrategy: adGroupForm.bidStrategy,
          destinationType: adGroupForm.destinationType,
          billingEvent: adGroupForm.billingEvent,
          dailyBudget: Number(adGroupForm.dailyBudget),
          country: adGroupForm.country,
          bidAmount: adGroupForm.bidAmount ? Number(adGroupForm.bidAmount) : undefined,
          status: adGroupForm.status,
        }),
      });
      await refreshLists();
      setAdForm((old) => ({ ...old, adGroupId: created.id || old.adGroupId }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const createAd = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy('ad');
    try {
      await request('/facebook-ads/ads', {
        method: 'POST',
        body: JSON.stringify(adForm),
      });
      await refreshLists();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const selectedGoal = useMemo(
    () => catalog?.optimizationGoals.find((item) => item.value === adGroupForm.optimizationGoal),
    [catalog, adGroupForm.optimizationGoal]
  );

  return (
    <main style={{ maxWidth: 980, margin: '32px auto', padding: 24 }}>
      <h1>Facebook Ads</h1>
      <p>
        Manage ads through Facebook Business Manager using Marketing API{' '}
        <strong>{catalog?.graphVersion || status?.graphVersion || 'v26.0'}</strong>. This is
        separate from organic Facebook Page posting.
      </p>
      {error && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}

      <section style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <h2>1. Connect Business Manager</h2>
        {connected ? (
          <p>
            Connected as <strong>{status.connection?.name}</strong>. Reconnect if you need to
            grant ads permissions again.
          </p>
        ) : (
          <p>Connect with ads_management, ads_read, and business_management permissions.</p>
        )}
        <button type="button" onClick={connect}>
          {connected ? 'Reconnect Facebook Ads' : 'Connect Facebook Ads'}
        </button>
      </section>

      {connected && (
        <form onSubmit={saveContext} style={{ display: 'grid', gap: 12, marginTop: 28 }}>
          <h2>2. Choose Business Manager and ad account</h2>
          <label>
            Business Manager
            <select value={businessId} onChange={(e) => loadAccounts(e.target.value)}>
              <option value="">All ad accounts I can access</option>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name} ({biz.id})
                </option>
              ))}
            </select>
          </label>
          <label>
            Ad account
            <select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} required>
              <option value="">Select an ad account</option>
              {adAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.account_id || account.id})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy === 'select'}>
            Use this ad account
          </button>
        </form>
      )}

      {selectedAccount && (
        <>
          <form onSubmit={createCampaign} style={{ display: 'grid', gap: 12, marginTop: 28 }}>
            <h2>3. Campaign (container for ad groups)</h2>
            <p>An ad group belongs to a campaign. Create one here or pick an existing campaign below.</p>
            <label>
              Name
              <input
                required
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
              />
            </label>
            <label>
              Objective
              <select
                value={campaignForm.objective}
                onChange={(e) => setCampaignForm({ ...campaignForm, objective: e.target.value })}
              >
                {(catalog?.campaignObjectives || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.value})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={busy === 'campaign'}>
              Create campaign (paused)
            </button>
            {campaigns.length > 0 && (
              <ul>
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    {campaign.name} — {campaign.objective} — {campaign.status}
                  </li>
                ))}
              </ul>
            )}
          </form>

          <form onSubmit={createAdGroup} style={{ display: 'grid', gap: 12, marginTop: 28 }}>
            <h2>4. Create ad group</h2>
            <p>
              Facebook calls this an ad set. Algorithm settings map to Marketing API fields{' '}
              <code>optimization_goal</code>, <code>bid_strategy</code>, and{' '}
              <code>destination_type</code>.
            </p>
            <label>
              Name
              <input
                required
                value={adGroupForm.name}
                onChange={(e) => setAdGroupForm({ ...adGroupForm, name: e.target.value })}
              />
            </label>
            <label>
              Campaign
              <select
                required
                value={adGroupForm.campaignId}
                onChange={(e) => setAdGroupForm({ ...adGroupForm, campaignId: e.target.value })}
              >
                <option value="">Select a campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Algorithm / optimization goal
              <select
                value={adGroupForm.optimizationGoal}
                onChange={(e) =>
                  setAdGroupForm({ ...adGroupForm, optimizationGoal: e.target.value })
                }
              >
                {(catalog?.optimizationGoals || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.value})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bid strategy
              <select
                value={adGroupForm.bidStrategy}
                onChange={(e) => setAdGroupForm({ ...adGroupForm, bidStrategy: e.target.value })}
              >
                {(catalog?.bidStrategies || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.value})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Delivery / destination type
              <select
                value={adGroupForm.destinationType}
                onChange={(e) =>
                  setAdGroupForm({ ...adGroupForm, destinationType: e.target.value })
                }
              >
                {(catalog?.destinationTypes || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.value})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Billing event
              <select
                value={adGroupForm.billingEvent}
                onChange={(e) => setAdGroupForm({ ...adGroupForm, billingEvent: e.target.value })}
              >
                {(catalog?.billingEvents || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.value})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Daily budget (account currency, minor units — e.g. 1000 = 10.00)
              <input
                required
                type="number"
                min={1}
                value={adGroupForm.dailyBudget}
                onChange={(e) => setAdGroupForm({ ...adGroupForm, dailyBudget: e.target.value })}
              />
            </label>
            {needsBidAmount && (
              <label>
                Bid amount (required for this bid strategy)
                <input
                  required
                  type="number"
                  min={1}
                  value={adGroupForm.bidAmount}
                  onChange={(e) => setAdGroupForm({ ...adGroupForm, bidAmount: e.target.value })}
                />
              </label>
            )}
            <label>
              Country (ISO, targeting.geo_locations.countries)
              <input
                required
                value={adGroupForm.country}
                onChange={(e) => setAdGroupForm({ ...adGroupForm, country: e.target.value })}
              />
            </label>
            <p>
              Selected algorithm: <code>{selectedGoal?.value}</code>
            </p>
            <button type="submit" disabled={busy === 'ad-group'}>
              Create ad group (paused)
            </button>
            {adGroups.length > 0 && (
              <ul>
                {adGroups.map((group) => (
                  <li key={group.id}>
                    {group.name} — {group.optimization_goal} / {group.bid_strategy} /{' '}
                    {group.destination_type}
                  </li>
                ))}
              </ul>
            )}
          </form>

          <form onSubmit={createAd} style={{ display: 'grid', gap: 12, marginTop: 28 }}>
            <h2>5. Create ad</h2>
            <label>
              Name
              <input
                required
                value={adForm.name}
                onChange={(e) => setAdForm({ ...adForm, name: e.target.value })}
              />
            </label>
            <label>
              Ad group
              <select
                required
                value={adForm.adGroupId}
                onChange={(e) => setAdForm({ ...adForm, adGroupId: e.target.value })}
              >
                <option value="">Select an ad group</option>
                {adGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Facebook Page
              <select
                required
                value={adForm.pageId}
                onChange={(e) => setAdForm({ ...adForm, pageId: e.target.value })}
              >
                <option value="">Select a Page</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Primary text
              <textarea
                required
                value={adForm.message}
                onChange={(e) => setAdForm({ ...adForm, message: e.target.value })}
              />
            </label>
            <label>
              Destination URL
              <input
                required
                type="url"
                value={adForm.link}
                onChange={(e) => setAdForm({ ...adForm, link: e.target.value })}
              />
            </label>
            <label>
              Headline
              <input
                value={adForm.headline}
                onChange={(e) => setAdForm({ ...adForm, headline: e.target.value })}
              />
            </label>
            <label>
              Description
              <input
                value={adForm.description}
                onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
              />
            </label>
            <label>
              Image URL (optional, uploaded to the ad account)
              <input
                type="url"
                value={adForm.imageUrl}
                onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
              />
            </label>
            <button type="submit" disabled={busy === 'ad'}>
              Create ad (paused)
            </button>
            {ads.length > 0 && (
              <ul>
                {ads.map((ad) => (
                  <li key={ad.id}>
                    {ad.name} — {ad.status}
                  </li>
                ))}
              </ul>
            )}
          </form>
        </>
      )}
    </main>
  );
};