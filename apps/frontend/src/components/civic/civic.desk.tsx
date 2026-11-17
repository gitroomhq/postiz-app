'use client';

import { FormEvent, useState } from 'react';

type Campaign = any;
const initial = { theme: 'check_voter_list', placeLabel: '', language: 'both', pollDate: '', officialUrl: '', helpline: '', paidForBy: '', authorizedBy: '', demoWatermark: true };

export const CivicDesk = () => {
  const [form, setForm] = useState(initial);
  const [campaign, setCampaign] = useState<Campaign>();
  const [postId, setPostId] = useState('');
  const [approverName, setApproverName] = useState('');
  const [error, setError] = useState('');
  const asset = campaign?.assets?.[0];
  const update = (key: string, value: string | boolean) => setForm((old) => ({ ...old, [key]: value }));
  const request = async (path: string, options?: RequestInit) => {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
  };
  const generate = async (event: FormEvent) => { event.preventDefault(); setError(''); try { setCampaign(await request('/civic-desk', { method: 'POST', body: JSON.stringify(form) })); } catch (e: any) { setError(e.message); } };
  const approve = async () => { try { setCampaign(await request(`/civic-desk/${campaign.id}/approve`, { method: 'POST', body: JSON.stringify({ paidForBy: form.paidForBy, authorizedBy: form.authorizedBy, approverName }) })); } catch (e: any) { setError(e.message); } };
  const linkPost = async () => { try { const receipt = await request(`/civic-desk/${campaign.id}/published-post`, { method: 'POST', body: JSON.stringify({ postId }) }); setCampaign({ ...campaign, status: 'published', receipts: [receipt] }); } catch (e: any) { setError(e.message); } };
  const handoff = async () => { await request(`/civic-desk/${campaign.id}/ads-manager-handoff`, { method: 'POST' }); window.open('https://www.facebook.com/adsmanager', '_blank', 'noopener,noreferrer'); };

  return <main style={{ maxWidth: 920, margin: '32px auto', padding: 24 }}>
    <h1>Civic information desk</h1>
    <p>Create neutral public-information assets. This desk never creates Meta ads, targeting, special categories, audience lists, or voter records.</p>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    <form onSubmit={generate} style={{ display: 'grid', gap: 12 }}>
      <h2>1. Setup</h2>
      <label>Theme <select value={form.theme} onChange={(e) => update('theme', e.target.value)}><option value="check_voter_list">Check public list</option><option value="polling_day">Polling day</option><option value="find_booth">Find official location information</option><option value="documents">Documents</option><option value="helpline">Helpline</option><option value="custom_civic">Custom civic</option></select></label>
      <label>Artwork place label <input required value={form.placeLabel} onChange={(e) => update('placeLabel', e.target.value)} /></label>
      <label>Language <select value={form.language} onChange={(e) => update('language', e.target.value)}><option value="both">Hindi + English</option><option value="hi">Hindi</option><option value="en">English</option></select></label>
      <label>Poll date <input type="date" value={form.pollDate} onChange={(e) => update('pollDate', e.target.value)} /></label>
      <label>Official URL <input type="url" value={form.officialUrl} onChange={(e) => update('officialUrl', e.target.value)} /></label>
      <label>Helpline <input value={form.helpline} onChange={(e) => update('helpline', e.target.value)} /></label>
      <label>Paid for by <input required value={form.paidForBy} onChange={(e) => update('paidForBy', e.target.value)} /></label>
      <label>Authorized by <input required value={form.authorizedBy} onChange={(e) => update('authorizedBy', e.target.value)} /></label>
      <label><input type="checkbox" checked={form.demoWatermark} onChange={(e) => update('demoWatermark', e.target.checked)} /> Add FICTIONAL DEMO watermark</label>
      <button type="submit">Generate package</button>
    </form>
    {asset && <section style={{ marginTop: 28 }}><h2>2. Preview — 1080 and 1920</h2><h3>{asset.headline}</h3><p>{asset.body}</p><pre style={{ whiteSpace: 'pre-wrap' }}>{asset.caption}</pre><p><strong>Reel voiceover:</strong> {asset.reelVO}</p><ol>{JSON.parse(asset.imagePrompts).map((prompt: string) => <li key={prompt}>{prompt}</li>)}</ol>
      {campaign.status === 'in_review' && <><h2>3. Approve</h2><label>Approver name <input required value={approverName} onChange={(e) => setApproverName(e.target.value)} /></label><button onClick={approve}>Human approve</button></>}
      {campaign.status === 'approved' && <><h2>4. Publish to connected Page</h2><p>Publish the approved caption through the normal Postiz Facebook composer first. Then paste that Postiz post ID below to link the verified published Page post.</p><input placeholder="Published Postiz post ID" value={postId} onChange={(e) => setPostId(e.target.value)} /><button onClick={linkPost}>Link published Page post</button></>}
      {campaign.status === 'published' && <><h2>5. Ads Manager handoff</h2><button onClick={() => navigator.clipboard.writeText(campaign.receipts?.[0]?.postId || '')}>Copy post ID</button><button onClick={handoff}>Open Ads Manager</button><ul><li>Boost this Page post or create a campaign using this post.</li><li>Set any permitted delivery choices only in Ads Manager.</li><li>Complete Meta authorization and disclosures if Meta asks.</li></ul></>}
    </section>}
  </main>;
};
