"use client";

import React, { useEffect, useRef, useState } from 'react';

export function BackgroundWave() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      console.log('Video loaded successfully');
      setVideoLoaded(true);
      setVideoError(null);
      video.play().catch(err => {
        console.error('Video play failed:', err);
        setVideoError(`Play failed: ${err.message}`);
      });
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error;
      const errorMessage = error ? `Video error: ${error.code} - ${error.message}` : 'Unknown video error';
      console.error('Video failed to load:', errorMessage);
      setVideoError(errorMessage);
      setVideoLoaded(false);
    };

    const handleCanPlay = () => {
      console.log('Video can play');
      video.play().catch(err => {
        console.error('Autoplay failed:', err);
      });
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    // Force load the video
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  return (
    <>
      {/* Debug info - remove in production */}
      <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
        <div>Video loaded: {videoLoaded ? 'Yes' : 'No'}</div>
        {videoError && <div className="text-red-400">Error: {videoError}</div>}
      </div>

      {/* Video Background */}
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover"
        style={{ 
          zIndex: -1,
          filter: 'brightness(0.4) contrast(1.1)',
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      >
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/quicktime" 
        />
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/mp4" 
        />
      </video>

      {/* Fallback gradient background - only shows if video fails */}
      {!videoLoaded && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
          style={{ zIndex: -2 }}
        />
      )}
    </>
  );
}