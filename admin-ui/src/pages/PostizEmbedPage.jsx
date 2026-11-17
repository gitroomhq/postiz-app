import { useTenant } from '../tenant'

export default function PostizEmbedPage({ title, postizPath, hint }) {
  const { selectedBrand, isWorkspace } = useTenant()
  const src = `/postiz${postizPath}`
  return (
    <div className="postiz-embed-page">
      <div className="postiz-embed-bar">
        <div>
          <h1 className="page-title">{title}</h1>
          {hint && <p className="text-muted text-sm">{hint}</p>}
          <p className="text-muted text-sm">
            {isWorkspace ? 'Workspace (shared)' : `Active brand: ${selectedBrand?.name || 'Brand'}`}
          </p>
        </div>
        <a className="btn btn-ghost btn-sm" href={`http://localhost:4007${postizPath}`} target="_blank" rel="noreferrer">Open Postiz ↗</a>
      </div>
      <iframe className="postiz-embed" src={src} title={title} />
    </div>
  )
}