"use client";

import { useEffect, useRef } from "react";

export default function AmbientBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }

    let frame = 0;
    let previousOpacity = -1;

    const updateOpacity = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(video.duration)) {
        const fadeIn = Math.min(video.currentTime / 2, 1);
        const fadeOut = Math.min((video.duration - video.currentTime) / 2, 1);
        const opacity = Math.max(0, Math.min(fadeIn, fadeOut));
        if (Math.abs(opacity - previousOpacity) > 0.01) {
          video.style.opacity = String(opacity);
          previousOpacity = opacity;
        }
      }
      frame = requestAnimationFrame(updateOpacity);
    };

    video.play().catch(() => undefined);
    frame = requestAnimationFrame(updateOpacity);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="earth-ambient-video-layer absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <video
        ref={videoRef}
        className="earth-ambient-video"
        src="/StockFootageFree_pindown.io_1794519535.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
      />
      <div className="earth-ambient-video-wash absolute inset-0" />
    </div>
  );
}