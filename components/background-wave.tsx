"use client";

import React from 'react';

export function BackgroundWave() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* YouTube video embed as background */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          className="absolute inset-0 w-full h-full object-cover filter brightness-50 contrast-125 scale-150"
          src="https://www.youtube.com/embed/-Tp0BbqDubY?autoplay=1&mute=1&loop=1&playlist=-Tp0BbqDubY&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&cc_load_policy=0&playsinline=1&enablejsapi=0"
          title="Background Video"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={{
            pointerEvents: 'none',
            border: 'none',
            outline: 'none'
          }}
        />
      </div>
      
      {/* Fallback gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 -z-10" />
    </div>
  );
}