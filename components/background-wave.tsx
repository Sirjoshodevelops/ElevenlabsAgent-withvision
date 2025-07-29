"use client";

import React, { useRef, useEffect } from 'react';

export function BackgroundWave() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = async () => {
      try {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        
        // Wait for video to be ready
        if (video.readyState >= 2) {
          await video.play();
        }
      } catch (error) {
        console.error('Video play failed:', error);
        // Retry after a short delay
        setTimeout(() => {
          video.play().catch(console.error);
        }, 1000);
      }
    };

    const handleCanPlay = () => {
      playVideo();
    };

    const handleLoadedData = () => {
      playVideo();
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);

    // Initial play attempt
    playVideo();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-[-1]">
      <video
        ref={videoRef}
        className="w-full h-full object-cover opacity-60"
        style={{
          filter: 'brightness(0.4) contrast(1.1) saturate(0.8)',
          pointerEvents: 'none'
        }}
        muted
        loop
        playsInline
        preload="auto"
        src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov"
      />
    </div>
  );
}