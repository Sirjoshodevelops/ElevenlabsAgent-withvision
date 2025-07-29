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
        let color = 'hsl(260, 10%, 25%)'; // Dark purple for inactive
        let centerColor = 'hsl(260, 10%, 25%)';
        
        if (isSpeaking) {
          // Dynamic colors based on output volume when agent is speaking
          const intensity = Math.min(1, outputVolume * 3);
          if (intensity > 0.7) {
            color = 'hsl(270, 100%, 70%)'; // Neon purple for high activity
            centerColor = 'hsl(270, 100%, 70%)';
          } else if (intensity > 0.4) {
            color = 'hsl(270, 80%, 60%)'; // Medium purple for medium activity
            centerColor = 'hsl(270, 80%, 60%)';
          } else {
            color = 'hsl(270, 60%, 50%)'; // Low purple for low activity
            centerColor = 'hsl(270, 60%, 50%)';
          }
        } else if (isActive) {
          // Subtle color when listening (based on input volume)
          const inputIntensity = Math.min(1, inputVolume * 2);
          if (inputIntensity > 0.3) {
            color = 'hsl(270, 100%, 70%)'; // Neon purple when user is speaking
            centerColor = 'hsl(270, 100%, 70%)';
          } else {
            color = 'hsl(260, 20%, 40%)'; // Light purple for active listening
            centerColor = 'hsl(260, 20%, 40%)';
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
      ctx.fillStyle = isActive ? (isSpeaking ? 'hsl(270, 100%, 70%)' : 'hsl(260, 20%, 40%)') : 'hsl(260, 10%, 25%)';
      ctx.fill();
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <BackgroundWave />
      <main className="relative z-10 w-full h-full max-w-[400px]">
        <ConvAI />
      </main>
    </div>
  );
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