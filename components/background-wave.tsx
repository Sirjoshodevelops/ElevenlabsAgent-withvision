"use client";

import React from 'react';

export function BackgroundWave() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover filter brightness-50 contrast-125 -z-20"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      >
        <source 
          src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c4952cd5ac503fabc495.mov" 
          type="video/mp4" 
        />
        Your browser does not support the video tag.
      </video>
      
      {/* Fallback gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 -z-10" />
    </div>
  );
}