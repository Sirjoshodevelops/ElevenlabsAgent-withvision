"use client";

import React, { useRef, useEffect, useState } from 'react';

export function BackgroundWave() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('BackgroundWave: Video element found, attempting to load...');

    const handleLoadStart = () => {
      console.log('BackgroundWave: Video load started');
    };

    const handleLoadedData = () => {
      console.log('BackgroundWave: Video data loaded');
      setVideoLoaded(true);
      playVideo();
    };

    const handleCanPlay = () => {
      console.log('BackgroundWave: Video can play');
      playVideo();
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement)?.error;
      const errorMessage = error ? `Video error: ${error.code} - ${error.message}` : 'Unknown video error';
      console.error('BackgroundWave: Video error:', errorMessage);
      setVideoError(errorMessage);
    };

    const handlePlay = () => {
      console.log('BackgroundWave: Video started playing');
    };

    const handlePause = () => {
      console.log('BackgroundWave: Video paused');
    };

    const playVideo = async () => {
      try {
        console.log('BackgroundWave: Attempting to play video...');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        
        await video.play();
        console.log('BackgroundWave: Video play successful');
      } catch (error) {
        console.error('BackgroundWave: Video play failed:', error);
        setVideoError(`Play failed: ${error}`);
        
        // Retry after a delay
        setTimeout(() => {
          console.log('BackgroundWave: Retrying video play...');
          video.play().catch(retryError => {
            console.error('BackgroundWave: Retry failed:', retryError);
          });
        }, 1000);
      }
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Set video properties
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;

    // Force load
    video.load();

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-[-1] bg-black">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 text-white p-2 rounded text-xs">
          <div>Video Status: {videoLoaded ? 'Loaded' : 'Loading...'}</div>
          {videoError && <div className="text-red-400">Error: {videoError}</div>}
        </div>
      )}
      
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
        autoPlay
        preload="auto"
        crossOrigin="anonymous"
      >
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/mp4"
        />
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/quicktime"
        />
        Your browser does not support the video tag.
      </video>
      
      {/* Fallback gradient background */}
      {videoError && (
        <div 
          className="absolute inset-0 w-full h-full opacity-60"
          style={{
            background: 'linear-gradient(45deg, #1a1a2e, #16213e, #0f3460)',
            filter: 'brightness(0.4) contrast(1.1) saturate(0.8)'
          }}
        />
      )}
    </div>
  );
}