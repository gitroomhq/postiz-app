'use client';

// This catches errors in (app)/layout.tsx children that escape the (site)/error.tsx boundary.
// Most useful for errors during initial layout mount before the inner error boundary is set up.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'sans-serif',
        background: '#0d0d0d',
        color: '#e5e5e5',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          maxWidth: 560,
          textAlign: 'center',
          padding: 32,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          This page could not load
        </div>
        <div style={{ fontSize: 14, color: '#aaa' }}>
          Press <strong>Retry</strong> to try again, or go to <strong>Launches</strong> to return to the main page.
        </div>
        {(error?.message || error?.digest) && (
          <details style={{ width: '100%', textAlign: 'left' }}>
            <summary style={{ fontSize: 12, color: '#888', cursor: 'pointer', userSelect: 'none' }}>
              Technical details (for administrators)
            </summary>
            {error?.message && (
              <div
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  background: '#1a1a1a',
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 8,
                  wordBreak: 'break-all',
                  color: '#aaa',
                }}
              >
                {error.message}
              </div>
            )}
            {error?.digest && (
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                digest: {error.digest}
              </div>
            )}
          </details>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            style={{
              padding: '8px 20px',
              background: '#612bd3',
              color: 'white',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => (window.location.href = '/launches')}
          >
            Go to Launches
          </button>
          <button
            style={{
              padding: '8px 20px',
              background: '#1a1a1a',
              color: '#e5e5e5',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => reset()}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
