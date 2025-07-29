"use client";

import React from 'react';

export function BackgroundWave() {
  return (
    <>
      {/* Video Background */}
      <video
        className="fixed inset-0 w-full h-full object-cover -z-10"
        style={{ 
          filter: 'brightness(0.3) contrast(1.2)',
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/mp4" 
        />
        Your browser does not support the video tag.
      </video>

      {/* Fallback gradient background */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 -z-20"
      />
    </>
  );
}