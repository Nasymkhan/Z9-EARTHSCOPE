"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  color: string;
  twinkleSpeed: number;
  twinklePhase: number;
}

export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;

    const stars: Star[] = [];
    const STAR_COUNT = 1600;

    // Realistic stellar classification colors (based on actual star temperatures)
    const STAR_COLORS = [
      "220, 235, 255", // Class O/B: deep blue-white
      "242, 246, 255", // Class A: pure diamond white
      "255, 250, 240", // Class F: warm white
      "255, 238, 210", // Class G: solar cream-yellow
      "255, 214, 170", // Class K: soft warm amber
      "255, 185, 160", // Class M: faint reddish dwarf
    ];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
      initStars();
    };

    const initStars = () => {
      stars.length = 0;

      // Milky Way diagonal angle (~32 degrees across the sky)
      const angle = 0.58;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cx = width * 0.52;
      const cy = height * 0.46;

      for (let i = 0; i < STAR_COUNT; i++) {
        // Density clustering toward the galactic plane
        const isGalactic = Math.random() < 0.68;
        let x: number, y: number;

        if (isGalactic) {
          // Along the galactic lane with Gaussian-like spread
          const u = (Math.random() - 0.5) * (width * 1.5);
          const v = (Math.random() - 0.5 + (Math.random() - 0.5)) * (height * 0.32);
          x = cx + u * cosA - v * sinA;
          y = cy + u * sinA + v * cosA;
        } else {
          // Distributed uniform background field
          x = Math.random() * width;
          y = Math.random() * height;
        }

        // Realistic magnitude distribution: vast majority are tiny faint specks
        const magRoll = Math.random();
        let size: number;
        let baseAlpha: number;

        if (magRoll > 0.985) {
          // Rare bright prominent stars
          size = 1.6 + Math.random() * 0.7;
          baseAlpha = 0.85 + Math.random() * 0.15;
        } else if (magRoll > 0.88) {
          // Medium magnitude
          size = 1.1 + Math.random() * 0.5;
          baseAlpha = 0.65 + Math.random() * 0.25;
        } else {
          // Vast faint stellar dust
          size = 0.45 + Math.random() * 0.55;
          baseAlpha = 0.25 + Math.random() * 0.45;
        }

        const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        const twinkleSpeed = 0.003 + Math.random() * 0.009;
        const twinklePhase = Math.random() * Math.PI * 2;

        stars.push({ x, y, size, baseAlpha, color, twinkleSpeed, twinklePhase });
      }
    };

    window.addEventListener("resize", resize);
    resize();

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let time = 0;

    const render = () => {
      time += 1;

      // 1. Deep cosmic foundation
      ctx.fillStyle = "#040812";
      ctx.fillRect(0, 0, width, height);

      // 2. Realistic Milky Way Galactic Dust Clouds & Core Bulge
      // Core galactic bulge (centered right of middle, behind earth depth)
      const coreX = width * 0.62;
      const coreY = height * 0.38;

      // Primary galactic core glow (warm starlight cream)
      const coreGrad = ctx.createRadialGradient(coreX, coreY, 10, coreX, coreY, width * 0.45);
      coreGrad.addColorStop(0, "rgba(255, 238, 215, 0.075)");
      coreGrad.addColorStop(0.2, "rgba(235, 220, 245, 0.055)");
      coreGrad.addColorStop(0.45, "rgba(70, 115, 185, 0.04)");
      coreGrad.addColorStop(0.75, "rgba(20, 45, 95, 0.02)");
      coreGrad.addColorStop(1, "rgba(4, 8, 18, 0)");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // Galactic lane sweeping diagonal nebulae
      ctx.save();
      ctx.translate(width * 0.5, height * 0.48);
      ctx.rotate(0.58);

      // Diffuse interstellar dust lane (deep space blue & subtle violet)
      const dustGrad = ctx.createLinearGradient(0, -height * 0.35, 0, height * 0.35);
      dustGrad.addColorStop(0, "rgba(8, 16, 36, 0)");
      dustGrad.addColorStop(0.3, "rgba(35, 75, 140, 0.045)");
      dustGrad.addColorStop(0.48, "rgba(95, 140, 210, 0.07)");
      dustGrad.addColorStop(0.52, "rgba(85, 115, 190, 0.065)");
      dustGrad.addColorStop(0.7, "rgba(40, 60, 120, 0.035)");
      dustGrad.addColorStop(1, "rgba(8, 16, 36, 0)");

      ctx.fillStyle = dustGrad;
      ctx.fillRect(-width, -height * 0.35, width * 2, height * 0.7);

      // Interstellar dark dust absorption rift (the Great Rift in the Milky Way)
      const riftGrad = ctx.createLinearGradient(0, -height * 0.12, 0, height * 0.12);
      riftGrad.addColorStop(0, "rgba(4, 8, 18, 0)");
      riftGrad.addColorStop(0.48, "rgba(3, 6, 14, 0.075)");
      riftGrad.addColorStop(0.52, "rgba(2, 5, 12, 0.08)");
      riftGrad.addColorStop(1, "rgba(4, 8, 18, 0)");

      ctx.fillStyle = riftGrad;
      ctx.fillRect(-width, -height * 0.12, width * 2, height * 0.24);

      // Subtle H-alpha ionized hydrogen emission region (subtle cosmic crimson)
      const hAlphaGrad = ctx.createRadialGradient(width * 0.15, -height * 0.05, 10, width * 0.15, -height * 0.05, width * 0.28);
      hAlphaGrad.addColorStop(0, "rgba(215, 110, 150, 0.038)");
      hAlphaGrad.addColorStop(0.5, "rgba(160, 80, 130, 0.02)");
      hAlphaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = hAlphaGrad;
      ctx.fillRect(-width, -height * 0.35, width * 2, height * 0.7);

      ctx.restore();

      // 3. Render authentic astronomical starfield
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        let alpha = star.baseAlpha;

        if (!prefersReducedMotion) {
          // Gentle realistic atmospheric twinkle
          alpha *= 0.82 + 0.18 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        }

        ctx.fillStyle = `rgba(${star.color}, ${alpha})`;

        if (star.size > 1.8) {
          // Bright star with subtle natural diffraction glow
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          // Delicate natural starlight aura
          ctx.fillStyle = `rgba(${star.color}, ${alpha * 0.16})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sharp sub-pixel pinpoint star
          ctx.fillRect(star.x, star.y, star.size, star.size);
        }
      }

      // 4. Subtle observatory vignette to ensure maximum text readability
      const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.3, width * 0.5, height * 0.5, width * 0.85);
      vignette.addColorStop(0, "rgba(4, 8, 18, 0)");
      vignette.addColorStop(0.7, "rgba(4, 8, 18, 0.35)");
      vignette.addColorStop(1, "rgba(3, 6, 14, 0.75)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}

