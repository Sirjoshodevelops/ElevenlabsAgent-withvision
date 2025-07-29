"use client";

import React, { useEffect, useRef, useState } from 'react';

export function BackgroundWave() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setIsLoaded(true);
      video.play().catch(console.error);
    };

    const handleError = (e: Event) => {
      console.error('Video failed to load:', e);
      setIsLoaded(false);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <>
      {/* Video Background */}
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover"
        style={{ 
          zIndex: -1,
          filter: 'brightness(0.3) contrast(1.2) saturate(0.9)',
        }}
        autoPlay
        muted
        loop
        playsInline
      >
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/mp4" 
        />
      </video>

      {/* Fallback gradient background if video fails */}
      {!isLoaded && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
          style={{ zIndex: -2 }}
        />
      )}
    </>
  );
}