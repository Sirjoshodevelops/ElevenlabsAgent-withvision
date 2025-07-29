"use client";

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean;
  inputVolume?: number;
  outputVolume?: number;
}

export function AudioVisualizer({ isActive, isSpeaking, inputVolume = 0, outputVolume = 0 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<Array<{ height: number, targetHeight: number, velocity: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 280;
    canvas.width = size;
    canvas.height = size;

    // Initialize bars
    const numBars = 64;
    if (barsRef.current.length === 0) {
      for (let i = 0; i < numBars; i++) {
        barsRef.current.push({
          height: 2,
          targetHeight: 2,
          velocity: 0
        });
      }
    }

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = 100;
      
      // Calculate activity level
      const activityLevel = Math.max(inputVolume, outputVolume);
      const baseIntensity = isActive ? 0.3 : 0.1;
      const speakingBoost = isSpeaking ? 0.7 : 0;
      const totalIntensity = baseIntensity + speakingBoost + (activityLevel * 2);
      
      // Update bars
      barsRef.current.forEach((bar, i) => {
        // Create different frequencies for each bar
        const frequency = (i / numBars) * Math.PI * 4;
        const noise = Math.sin(time * 0.02 + frequency) * 0.5 + 0.5;
        const volumeNoise = Math.sin(time * 0.05 + i * 0.1) * activityLevel * 50;
        
        // Calculate target height based on activity
        let targetHeight = 2 + (noise * totalIntensity * 40) + volumeNoise;
        
        // Add speaking-specific patterns
        if (isSpeaking) {
          const speakingPattern = Math.sin(time * 0.08 + i * 0.2) * 20;
          targetHeight += Math.abs(speakingPattern);
        }
        
        // Smooth animation
        const diff = targetHeight - bar.height;
        bar.velocity += diff * 0.02;
        bar.velocity *= 0.85; // Damping
        bar.height += bar.velocity;
        
        // Clamp values
        bar.height = Math.max(2, Math.min(60, bar.height));
      });
      
      // Draw circular visualizer
      barsRef.current.forEach((bar, i) => {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const barWidth = 2;
        const barHeight = bar.height;
        
        // Calculate positions
        const innerRadius = radius - 10;
        const outerRadius = innerRadius + barHeight;
        
        const x1 = centerX + Math.cos(angle) * innerRadius;
        const y1 = centerY + Math.sin(angle) * innerRadius;
        const x2 = centerX + Math.cos(angle) * outerRadius;
        const y2 = centerY + Math.sin(angle) * outerRadius;
        
        // Set color based on state
        let color = '#374151'; // Gray for inactive
        let centerColor = '#374151';
        
        if (isSpeaking) {
          // Dynamic colors based on output volume when agent is speaking
          const intensity = Math.min(1, outputVolume * 3);
          if (intensity > 0.7) {
            color = '#8B5CF6'; // Purple for high activity
            centerColor = '#8B5CF6';
          } else if (intensity > 0.4) {
            color = '#3B82F6'; // Blue for medium activity
            centerColor = '#3B82F6';
          } else {
            color = '#06B6D4'; // Cyan for low activity
            centerColor = '#06B6D4';
          }
        } else if (isActive) {
          // Subtle color when listening (based on input volume)
          const inputIntensity = Math.min(1, inputVolume * 2);
          if (inputIntensity > 0.3) {
            color = '#10B981'; // Green when user is speaking
            centerColor = '#10B981';
          } else {
            color = '#6B7280'; // Light gray for active listening
            centerColor = '#6B7280';
          }
        }
        
        // Draw bar
        ctx.strokeStyle = color;
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      
      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? (isSpeaking ? '#3B82F6' : '#6B7280') : '#374151';
      ctx.fill();
      
      // Add center pulse effect
      if (isActive) {
        const pulseRadius = 20 + Math.sin(time * 0.1) * 3 + (activityLevel * 10);
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSpeaking ? '#3B82F6' : '#6B7280';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
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
        className="w-full h-full"
        style={{
          background: 'transparent',
          maxWidth: '280px',
          maxHeight: '280px',
        }}
      />
    </div>
  );
}