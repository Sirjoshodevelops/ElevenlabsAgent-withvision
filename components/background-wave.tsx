"use client";

import React from 'react';

export function BackgroundWave() {
  return (
    <div className="fixed inset-0 w-full h-full z-[-1] overflow-hidden">
      {/* Simple video element with direct attributes */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'brightness(0.3) contrast(1.2)',
          opacity: 0.8
        }}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        preload="auto"
      >
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov" 
          type="video/mp4"
        />
      </video>
      
      {/* Fallback dark background */}
      <div 
        className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-800"
        style={{ zIndex: -2 }}
      />
    </div>
  );
}