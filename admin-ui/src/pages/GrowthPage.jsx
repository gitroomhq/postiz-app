import { useEffect, useState } from 'react'
import { growth } from '../api'

export default function GrowthPage() {
  const [data, setData] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ topic: '', offer: '', audience: 'Indian young adults', area: '', language: 'Hinglish', objective: 'dm', campaignType: 'normal', adObjective: 'messages' })

  async function load() { try { setData(await growth.recommendations()) } catch (e) { setError(e.message) } }
  useEffect(() => { load() }, [])
  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    // Validation feedback belongs to the previous submission. Do not leave it
    // visible after the user has corrected the field.
    if (error) setError('')
  }
  async function createCampaign(event) { event.preventDefault(); setError(''); try { setCampaign(await growth.campaign(form)) } catch (e) { setError(e.message) } }
  const copy = async (text) => { try { await navigator.clipboard.writeText(text) } catch { setError('Browser clipboard permission was denied.') } }

  return <div>
    <div className="page-header"><div><h1 className="page-title">AI Growth Agent</h1><p className="text-muted mt-4">Create ethical, conversion-focused calls-to-action and human-ready inquiry responses.</p></div><button className="btn btn-primary btn-sm" onClick={load}>Refresh recommendations</button></div>
    {error && <div className="alert alert-error">{error}</div>}
    <div className="alert alert-info">{data?.policy || 'The agent creates content and response drafts. It never sends unsolicited messages, follow requests, or mass actions.'}</div>
    <form className="card" onSubmit={createCampaign}>
      <h2 className="card-title">Create an audience campaign</h2>
      <div className="grid-3">
        <div className="form-group"><label>Post type</label><select className="form-control" value={form.campaignType} onChange={(e) => updateForm('campaignType', e.target.value)}><option value="normal">Normal organic post</option><option value="advertisement">Advertisement campaign</option></select></div>
        <div className="form-group"><label>Campaign topic</label><input className="form-control" required value={form.topic} onChange={(e) => updateForm('topic', e.target.value)} placeholder="Handmade dining tables" /></div>
        <div className="form-group"><label>Objective</label><select className="form-control" value={form.objective} onChange={(e) => updateForm('objective', e.target.value)}><option value="dm">Get DMs / inquiries</option><option value="follow">Encourage follows</option><option value="like">Encourage likes and saves</option><option value="subscribe">Encourage subscriptions / alerts</option></select></div>
        <div className="form-group"><label>Offer (optional)</label><input className="form-control" value={form.offer} onChange={(e) => updateForm('offer', e.target.value)} placeholder="Up to 40% off this weekend" /></div>
      </div>
      <div className="grid-3">
        <div className="form-group"><label>Audience</label><input className="form-control" value={form.audience} onChange={(e) => updateForm('audience', e.target.value)} /></div>
        <div className="form-group"><label>Area / service location</label><input className="form-control" value={form.area} onChange={(e) => updateForm('area', e.target.value)} placeholder="Delhi NCR" /></div>
        <div className="form-group"><label>Language</label><input className="form-control" value={form.language} onChange={(e) => updateForm('language', e.target.value)} /></div>
      </div>
      {form.campaignType === 'advertisement' && <div className="alert alert-info">Advertisement mode creates Meta Ads Manager-ready copy and setup guidance. It does not publish a paid ad automatically; ad account, budget, billing, targeting, and final review stay in Meta Ads Manager.<div className="form-group mt-4"><label>Meta ad objective</label><select className="form-control" value={form.adObjective} onChange={(e) => updateForm('adObjective', e.target.value)}><option value="messages">Messages / inquiries</option><option value="leads">Leads</option><option value="traffic">Website traffic</option><option value="sales">Sales / conversions</option><option value="awareness">Awareness</option></select></div></div>}
      <button className="btn btn-primary">Create campaign kit</button>
    </form>
    {campaign && <div className="card">
      <div className="page-header"><h2 className="card-title">Campaign kit</h2><button className="btn btn-ghost btn-sm" onClick={() => copy([campaign.hook, campaign.caption, campaign.commentPrompt].join('\n\n'))}>Copy post</button></div>
      <div className="form-group"><label>Hook</label><div className="form-control">{campaign.hook}</div></div>
      <div className="form-group"><label>Caption and CTA</label><div className="form-control prewrap">{campaign.caption}</div></div>
      <div className="grid-2"><div className="form-group"><label>Comment prompt</label><div className="form-control prewrap">{campaign.commentPrompt}</div></div><div className="form-group"><label>Human-ready DM reply</label><div className="form-control prewrap">{campaign.replyDraft}</div></div></div>
      <div className="alert alert-info">DM keyword: <strong>{campaign.dmKeyword}</strong>. Use it in the post and reply to inbound messages through your approved support process.</div>
      {campaign.adCampaign && <div className="card" style={{ background: '#0f172a' }}><h2 className="card-title">Meta advertisement setup kit</h2><div className="grid-2"><div className="form-group"><label>Objective</label><div className="form-control">{campaign.adCampaign.objective}</div></div><div className="form-group"><label>Call to action</label><div className="form-control">{campaign.adCampaign.callToAction}</div></div><div className="form-group"><label>Headline</label><div className="form-control">{campaign.adCampaign.headline}</div></div><div className="form-group"><label>Success metric</label><div className="form-control">{campaign.adCampaign.recommendedMetric}</div></div></div><div className="form-group"><label>Primary text</label><div className="form-control prewrap">{campaign.adCampaign.primaryText}</div></div><div className="form-group"><label>Description</label><div className="form-control">{campaign.adCampaign.description}</div></div><ul className="checklist">{campaign.adCampaign.setupChecklist.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      <ul className="checklist">{campaign.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>}
    <div className="recommendation-grid">{(data?.recommendations || []).map((item) => <div className="card" key={item.title}><span className={`badge ${item.priority === 'high' ? 'badge-unhealthy' : item.priority === 'medium' ? 'badge-starting' : 'badge-healthy'}`}>{item.priority}</span><h2 className="recommendation-title">{item.title}</h2><p className="text-muted">{item.detail}</p></div>)}</div>
  </div>
}
