/**
 * BB Post — Open Graph Image
 *
 * File-based OG image convention (Next.js 14).
 * Automatically served at /opengraph-image and covers both OG (Facebook, LinkedIn)
 * and Twitter card (Twitter falls back to OG image automatically).
 *
 * Uses next/og (built-in) — NOT @vercel/og.
 * Runs on Node.js runtime (not Edge) for full compatibility.
 */
import { ImageResponse } from 'next/og';

export const alt = 'BB Post — All your social media. One smart dashboard.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0E0E0E',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Purple glow accent */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '300px',
            background: 'rgba(139, 92, 246, 0.12)',
            borderRadius: '50%',
            filter: 'blur(80px)',
          }}
        />

        {/* Logo + name row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#8B5CF6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            B
          </div>
          <span
            style={{ fontSize: '28px', color: 'white', fontWeight: '700' }}
          >
            BB Post
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: '800',
            color: 'white',
            lineHeight: 1.1,
            maxWidth: '900px',
            marginBottom: '28px',
          }}
        >
          All your social media.{' '}
          <span style={{ color: '#8B5CF6' }}>One smart dashboard.</span>
        </div>

        {/* Subheadline */}
        <div
          style={{
            fontSize: '28px',
            color: '#9CA3AF',
            maxWidth: '700px',
            lineHeight: 1.4,
            marginBottom: '48px',
          }}
        >
          Open-source scheduler for 19+ platforms. Free to start.
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            '27,800+ GitHub Stars',
            '19+ Platforms',
            '100% Open Source',
          ].map((stat) => (
            <div
              key={stat}
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '999px',
                padding: '10px 20px',
                fontSize: '18px',
                color: '#A78BFA',
                fontWeight: '600',
              }}
            >
              {stat}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
