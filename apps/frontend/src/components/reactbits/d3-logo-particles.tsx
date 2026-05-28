'use client';

import { useEffect, useRef } from 'react';

// Brand yellow — must match colors.scss brand-500.
const PARTICLE_COLOR = '#F2E600';
// Slightly brighter highlight when particles are scattered by the cursor.
const SCATTER_COLOR = '#FDE047';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  life: number;
}

interface D3LogoParticlesProps {
  /** Square render size in CSS pixels (default 320). */
  size?: number;
  /**
   * Target particle count at 1920×1080 reference; scales by area down to
   * smaller canvases. Default tuned so the chain-link silhouette stays
   * dense enough to read at 240-400px.
   */
  particleCount?: number;
  /** Scatter radius around the cursor (default 36px). */
  scatterRadius?: number;
  /** Path to the logo image. Must be a same-origin PNG/SVG/JPG with alpha. */
  logoSrc?: string;
  className?: string;
}

/**
 * D3-branded particle logo. Loads the real /d3-logo.png brand asset onto an
 * off-screen canvas, samples opaque pixels, and renders ~`particleCount`
 * particles tracing that silhouette. Hovering near the logo scatters
 * particles outward; they spring back to the silhouette on mouse-leave.
 *
 * Contained — sized to the `size` prop, not the viewport. Respects
 * prefers-reduced-motion by rendering a single static frame.
 */
export function D3LogoParticles({
  size = 320,
  particleCount = 12000,
  scatterRadius = 36,
  logoSrc = '/d3-logo.png',
  className,
}: D3LogoParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const touching = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    let particles: Particle[] = [];
    let logoImageData: ImageData | null = null;
    let animationFrameId = 0;
    let cancelled = false;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;

    function sampleParticle(): Particle | null {
      if (!logoImageData || !canvas) return null;
      const data = logoImageData.data;
      const w = canvas.width;
      const h = canvas.height;
      for (let attempt = 0; attempt < 80; attempt++) {
        const px = Math.floor(Math.random() * w);
        const py = Math.floor(Math.random() * h);
        const alpha = data[(py * w + px) * 4 + 3];
        if (alpha > 128) {
          return {
            x: px / dpr,
            y: py / dpr,
            baseX: px / dpr,
            baseY: py / dpr,
            size: Math.random() * 1.3 + 0.7,
            life: Math.random() * 100 + 50,
          };
        }
      }
      return null;
    }

    function seed() {
      if (!canvas) return;
      const area = size * size;
      const reference = 1920 * 1080;
      const target = Math.max(
        800,
        Math.floor(particleCount * Math.sqrt(area / reference)),
      );
      particles = [];
      let safety = target * 4;
      while (particles.length < target && safety-- > 0) {
        const p = sampleParticle();
        if (p) particles.push(p);
      }
    }

    function tick() {
      if (cancelled || !ctx || !canvas) return;
      ctx.clearRect(0, 0, size, size);

      const { x: mx, y: my } = mouse.current;
      const allowScatter =
        !reducedMotion &&
        (touching.current || !('ontouchstart' in window));

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (allowScatter && dist < scatterRadius) {
          const force = (scatterRadius - dist) / scatterRadius;
          const angle = Math.atan2(dy, dx);
          p.x = p.baseX - Math.cos(angle) * force * 22;
          p.y = p.baseY - Math.sin(angle) * force * 22;
          ctx.fillStyle = SCATTER_COLOR;
        } else {
          p.x += (p.baseX - p.x) * 0.08;
          p.y += (p.baseY - p.y) * 0.08;
          ctx.fillStyle = PARTICLE_COLOR;
        }

        ctx.fillRect(p.x, p.y, p.size, p.size);

        p.life--;
        if (p.life <= 0) {
          const replacement = sampleParticle();
          if (replacement) particles[i] = replacement;
        }
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(tick);
      }
    }

    function renderStaticFrame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = PARTICLE_COLOR;
      for (const p of particles) {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }

    function startAnimation() {
      if (reducedMotion) {
        renderStaticFrame();
      } else {
        tick();
      }
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      startAnimation();
    };
    reducedMotionQuery.addEventListener('change', handleMotionChange);

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => updateMouse(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchStart = () => {
      touching.current = true;
    };
    const onTouchEnd = () => {
      touching.current = false;
      mouse.current = { x: -1000, y: -1000 };
    };
    const onMouseLeave = () => {
      mouse.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchend', onTouchEnd);

    // Load the real D3 brand asset and rasterize it onto the off-screen
    // canvas, then sample particle positions from its alpha channel.
    const img = new Image();
    img.decoding = 'async';
    img.src = logoSrc;
    img.onload = () => {
      if (cancelled || !ctx || !canvas) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      logoImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, size, size);
      seed();
      startAnimation();
    };

    return () => {
      cancelled = true;
      reducedMotionQuery.removeEventListener('change', handleMotionChange);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [size, particleCount, scatterRadius, logoSrc]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="D3 Creator logo"
      role="img"
      className={className}
    />
  );
}
