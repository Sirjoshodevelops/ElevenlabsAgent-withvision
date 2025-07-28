"use client";

import React, { useRef, useEffect } from 'react';
import { Orb } from './orb/Orb';

interface WebGLOrbProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export function WebGLOrb({ isActive = false, isSpeaking = false, className = "" }: WebGLOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<Orb | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      orbRef.current = new Orb(canvasRef.current);
    } catch (error) {
      console.error('Failed to initialize WebGL orb:', error);
    }

    return () => {
      if (orbRef.current) {
        orbRef.current.dispose();
        orbRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!orbRef.current) return;

    // Update colors based on state
    if (isActive && isSpeaking) {
      // Active and speaking - bright, vibrant colors
      orbRef.current.updateColors("#00FFFF", "#FF64FF");
    } else if (isActive) {
      // Active but not speaking - moderate colors
      orbRef.current.updateColors("#2792DC", "#9CE6E6");
    } else {
      // Inactive - muted colors
      orbRef.current.updateColors("#1E40AF", "#3B82F6");
    }
  }, [isActive, isSpeaking]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-60 h-60 rounded-full"
        style={{
          filter: isActive && isSpeaking 
            ? 'drop-shadow(0 0 40px rgba(0, 255, 255, 0.6))' 
            : isActive 
            ? 'drop-shadow(0 0 20px rgba(39, 146, 220, 0.4))'
            : 'drop-shadow(0 0 10px rgba(30, 64, 175, 0.3))'
        }}
      />
    </div>
  );
}