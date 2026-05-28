'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const SEPARATION = 150;
const AMOUNT_X = 40;
const AMOUNT_Y = 60;

/**
 * The Three.js scene that owns the animated dot grid. Lives inside an
 * absolute layer behind the hero content. Listens for container resize so
 * the surface always matches its parent without cutoff, and pauses the
 * animation loop when prefers-reduced-motion is set.
 */
export function DottedSurfaceCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene + camera + renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0d, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Dot grid geometry
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    for (let ix = 0; ix < AMOUNT_X; ix++) {
      for (let iy = 0; iy < AMOUNT_Y; iy++) {
        const x = ix * SEPARATION - (AMOUNT_X * SEPARATION) / 2;
        const z = iy * SEPARATION - (AMOUNT_Y * SEPARATION) / 2;
        positions.push(x, 0, z);
        // Light-gray dots — D3 stays in white/yellow palette, neutral here.
        colors.push(200 / 255, 200 / 255, 200 / 255);
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Reduced-motion check — render once and skip the loop.
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;

    let animationId = 0;
    let count = 0;

    const positionAttribute = geometry.attributes.position;
    const positionArray = positionAttribute.array as Float32Array;

    const tickPositions = () => {
      let i = 0;
      for (let ix = 0; ix < AMOUNT_X; ix++) {
        for (let iy = 0; iy < AMOUNT_Y; iy++) {
          positionArray[i * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }
      positionAttribute.needsUpdate = true;
    };

    const renderOnce = () => {
      tickPositions();
      renderer.render(scene, camera);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      tickPositions();
      renderer.render(scene, camera);
      count += 0.1;
    };

    const start = () => {
      if (reducedMotion) {
        renderOnce();
      } else {
        animate();
      }
    };

    const stop = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = 0;
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      stop();
      start();
    };
    reducedMotionQuery.addEventListener('change', handleMotionChange);

    // ResizeObserver so the dot surface always fits its container — no cutoff
    // when the layout grows.
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (reducedMotion) renderOnce();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    start();

    return () => {
      stop();
      reducedMotionQuery.removeEventListener('change', handleMotionChange);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    />
  );
}
