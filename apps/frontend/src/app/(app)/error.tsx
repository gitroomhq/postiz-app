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
          Postiz encountered an error
        </div>
        {error?.message && (
          <div
            style={{
              fontSize: 13,
              fontFamily: 'monospace',
              background: '#1a1a1a',
              borderRadius: 8,
              padding: 12,
              width: '100%',
              textAlign: 'left',
              wordBreak: 'break-all',
              color: '#aaa',
            }}
          >
            {error.message}
          </div>
        )}
        {error?.digest && (
          <div style={{ fontSize: 11, color: '#888' }}>
            digest: {error.digest}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            style={{
              padding: '8px 20px',
              background: '#4f46e5',
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
