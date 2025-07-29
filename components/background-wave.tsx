"use client";

import React, { useEffect, useRef, useState } from 'react';

export function BackgroundWave() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string>('');
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      console.log('Video can play');
      setVideoLoaded(true);
      video.play().catch(error => {
        console.error('Play failed:', error);
        setVideoError(`Play failed: ${error.message}`);
      });
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error;
      const errorMessage = error ? `Video error: ${error.code} - ${error.message}` : 'Unknown video error';
      console.error('Video error:', errorMessage);
      setVideoError(errorMessage);
    };

    const handleLoadStart = () => {
      console.log('Video load started');
    };

    const handleLoadedData = () => {
      console.log('Video data loaded');
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);

    // Force load the video
    video.load();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-[-1] overflow-hidden bg-black">
      {/* Debug info */}
      <div className="absolute top-4 left-4 z-10 text-white text-xs bg-black/50 p-2 rounded">
        <div>Video loaded: {videoLoaded ? 'Yes' : 'No'}</div>
        {videoError && <div className="text-red-400">Error: {videoError}</div>}
      </div>

      {/* Try multiple video sources and formats */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'brightness(0.4) contrast(1.1)',
          opacity: 0.8
        }}
        muted
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      >
        {/* Original source */}
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/quicktime"
        />
        {/* Try as MP4 */}
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/mp4"
        />
        {/* Fallback video from a reliable CDN */}
        <source 
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
          type="video/mp4"
        />
      </video>
      
      {/* Fallback background */}
      <div 
        className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-800"
        style={{ 
          zIndex: -2,
          display: videoLoaded ? 'none' : 'block'
        }}
      />
    </div>
  );
}