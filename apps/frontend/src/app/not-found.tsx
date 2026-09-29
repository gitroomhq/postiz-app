import Link from 'next/link';

// postmonster: branded 404 (PRD 7.4)
export default function NotFound() {
  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#0E0F13',
          color: '#F6F4EE',
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-text.svg" alt="Postmonster" width={180} />
          <div style={{ fontSize: '56px', fontWeight: 600, lineHeight: 1 }}>
            404
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            This page does not exist
          </div>
          <div style={{ opacity: 0.7, maxWidth: '420px' }}>
            The link may be broken, or the page may have been moved. Everything
            else still works.
          </div>
          <Link
            href="/dashboard"
            style={{
              marginTop: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              background: '#C8F560',
              color: '#0E0F13',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </body>
    </html>
  );
}
