"use client";

import React, { useEffect, useRef, useState } from 'react';

export function BackgroundWave() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStatus, setVideoStatus] = useState('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      console.log('Video load started');
      setVideoStatus('loading');
    };

    const handleCanPlay = () => {
      console.log('Video can play');
      setVideoStatus('ready');
      video.play().catch(err => {
        console.error('Play failed:', err);
        setError(`Play failed: ${err.message}`);
      });
    };

    const handleLoadedData = () => {
      console.log('Video data loaded');
      setVideoStatus('loaded');
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      const errorCode = target.error?.code;
      const errorMessage = target.error?.message || 'Unknown error';
      console.error('Video error:', errorCode, errorMessage);
      setError(`Error ${errorCode}: ${errorMessage}`);
      setVideoStatus('error');
    };

    const handlePlay = () => {
      console.log('Video playing');
      setVideoStatus('playing');
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);

    // Force load
    video.load();

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
    };
  }, []);

  return (
    <>
      {/* Debug Panel */}
      <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
        <div>Status: {videoStatus}</div>
        {error && <div className="text-red-400">Error: {error}</div>}
      </div>

      {/* Gradient Background (fallback) */}
      <div 
        className={`fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 transition-opacity duration-1000 ${
          videoStatus === 'playing' ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ zIndex: -2 }}
      />

      {/* Video Background */}
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover"
        style={{ 
          zIndex: -1,
          filter: 'brightness(0.4) contrast(1.1) saturate(0.8)',
          opacity: 0.6
        }}
        autoPlay
        muted
        loop
        playsInline
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
    </>
  );
}