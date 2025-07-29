"use client";

import React, { useEffect, useRef } from 'react';

export function BackgroundWave() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Force video to play
      video.play().catch(console.error);
      
      // Ensure video loops properly
      video.addEventListener('ended', () => {
        video.currentTime = 0;
        video.play().catch(console.error);
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      className="fixed inset-0 w-full h-full object-cover z-[-1] opacity-75"
      src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      style={{
        filter: 'brightness(0.3) contrast(1.2)',
      }}
      onLoadedData={() => {
        const video = videoRef.current;
        if (video) {
          video.play().catch(console.error);
        }
      }}
    />
  );
}