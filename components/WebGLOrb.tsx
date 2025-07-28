"use client";

import React, { useEffect, useRef } from 'react';
import { Orb } from './orb/Orb';

interface WebGLOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  inputVolume?: number;
  outputVolume?: number;
}

export function WebGLOrb({ isActive, isSpeaking, inputVolume = 0, outputVolume = 0 }: WebGLOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<Orb | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      orbRef.current = new Orb(canvasRef.current);
    } catch (error) {
      console.error('Failed to initialize WebGL orb:', error);
      return;
    }

    return () => {
      if (orbRef.current) {
        orbRef.current.dispose();
        orbRef.current = null;
      }
    };
  }, []);

  // Update colors based on state
  useEffect(() => {
    if (!orbRef.current) return;

    if (isSpeaking) {
      // Speaking: Cyan to purple gradient with enhanced glow
      orbRef.current.updateColors("#00FFFF", "#FF00FF");
    } else if (isActive) {
      // Active: Blue gradient with moderate glow
      orbRef.current.updateColors("#2792DC", "#9CE6E6");
    } else {
      // Inactive: Dark blue with subtle glow
      orbRef.current.updateColors("#1E3A8A", "#3B82F6");
    }
  }, [isActive, isSpeaking]);

  // Update volume data
  useEffect(() => {
    if (!orbRef.current) return;
    orbRef.current.updateVolume(inputVolume, outputVolume);
  }, [inputVolume, outputVolume]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`w-60 h-60 transition-all duration-300 ${
          isSpeaking 
            ? 'drop-shadow-[0_0_40px_rgba(0,255,255,0.8)]' 
            : isActive 
            ? 'drop-shadow-[0_0_20px_rgba(39,146,220,0.6)]' 
            : 'drop-shadow-[0_0_10px_rgba(30,58,138,0.4)]'
        }`}
        style={{
          background: 'transparent',
        }}
      />
    </div>
  );
}