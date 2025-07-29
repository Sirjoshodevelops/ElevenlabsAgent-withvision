"use client";

import React, { useEffect, useRef } from 'react';

interface WebGLOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  inputVolume?: number;
  outputVolume?: number;
}

export function WebGLOrb({ isActive, isSpeaking, inputVolume = 0, outputVolume = 0 }: WebGLOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Animation parameters
    let time = 0;
    const particles: Array<{x: number, y: number, angle: number, radius: number}> = [];
    
    // Create particles for wireframe effect
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * size,
        y: Math.random() * size,
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 2 + 1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      
      // Draw main circle
      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = 80;
      
      // Add volume-based pulsing
      const volumeEffect = Math.max(inputVolume, outputVolume) * 20;
      const radius = baseRadius + volumeEffect + Math.sin(time * 0.05) * 5;
      
      // Set colors based on state
      let fillColor = '#3B82F6'; // Blue for inactive
      if (isSpeaking) {
        fillColor = '#8B5CF6'; // Purple for speaking
      } else if (isActive) {
        fillColor = '#06B6D4'; // Cyan for active
      }
      
      // Draw filled circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Draw wireframe particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      particles.forEach((particle, index) => {
        // Calculate particle position relative to circle
        const distFromCenter = Math.sqrt(
          Math.pow(particle.x - centerX, 2) + Math.pow(particle.y - centerY, 2)
        );
        
        // Only show particles within the circle
        if (distFromCenter <= radius) {
          // Add some movement to particles
          const offsetX = Math.sin(time * 0.02 + index * 0.1) * 2;
          const offsetY = Math.cos(time * 0.02 + index * 0.1) * 2;
          
          ctx.beginPath();
          ctx.arc(
            particle.x + offsetX, 
            particle.y + offsetY, 
            particle.radius, 
            0, 
            Math.PI * 2
          );
          ctx.fill();
        }
      });
      
      // Draw wireframe grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      
      // Horizontal lines
      for (let i = 0; i < 8; i++) {
        const y = (size / 8) * i;
        const lineRadius = Math.sqrt(Math.pow(radius, 2) - Math.pow(y - centerY, 2));
        if (!isNaN(lineRadius)) {
          ctx.beginPath();
          ctx.moveTo(centerX - lineRadius, y);
          ctx.lineTo(centerX + lineRadius, y);
          ctx.stroke();
        }
      }
      
      // Vertical lines
      for (let i = 0; i < 8; i++) {
        const x = (size / 8) * i;
        const lineRadius = Math.sqrt(Math.pow(radius, 2) - Math.pow(x - centerX, 2));
        if (!isNaN(lineRadius)) {
          ctx.beginPath();
          ctx.moveTo(x, centerY - lineRadius);
          ctx.lineTo(x, centerY + lineRadius);
          ctx.stroke();
        }
      }
      
      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isSpeaking, inputVolume, outputVolume]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-all duration-300 ${
          isSpeaking 
            ? 'drop-shadow-[0_0_40px_rgba(139,92,246,0.8)]' 
            : isActive 
            ? 'drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]' 
            : 'drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]'
        }`}
        style={{
          background: 'transparent',
          maxWidth: '200px',
          maxHeight: '200px',
        }}
      />
    </div>
  );
}