"use client";

import React, { useEffect, useRef } from 'react';
import { ThreeOrb } from './orb/ThreeOrb';

interface WebGLOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  inputVolume?: number;
  outputVolume?: number;
}

export function WebGLOrb({ isActive, isSpeaking, inputVolume = 0, outputVolume = 0 }: WebGLOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<ThreeOrb | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      orbRef.current = new ThreeOrb(canvasRef.current);
    } catch (error) {
      console.error('Failed to initialize Three.js orb:', error);
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
      // Speaking: Cyan to purple gradient with enhanced effects
      orbRef.current.updateColors("#00FFFF", "#FF00FF");
      orbRef.current.updateParams({
        threshold: 0.3,
        strength: 1.5,
        radius: 0.9
      });
    } else if (isActive) {
      // Active: Blue gradient with moderate effects
      orbRef.current.updateColors("#2792DC", "#9CE6E6");
      orbRef.current.updateParams({
        threshold: 0.5,
        strength: 0.8,
        radius: 0.8
      });
    } else {
      // Inactive: Dark blue with subtle effects
      orbRef.current.updateColors("#1E3A8A", "#3B82F6");
      orbRef.current.updateParams({
        threshold: 0.7,
        strength: 0.3,
        radius: 0.6
      });
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