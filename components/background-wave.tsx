"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {/* Purple glow effects */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 via-violet-600/10 to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/8 to-transparent animate-pulse delay-1000"></div>
      
      <motion.video
        src="/wave-loop.mp4"
        autoPlay
        muted
        loop
        className="fixed object-cover bottom-0 z-[1] w-full h-full hidden md:block pointer-events-none opacity-95"
        style={{
          filter: 'hue-rotate(200deg) saturate(3) brightness(1.2) contrast(1.5) blur(0px)',
          boxShadow: '0 0 120px rgba(147, 51, 234, 0.4), 0 0 240px rgba(168, 85, 247, 0.3)',
          imageRendering: 'optimizeQuality',
          transform: 'scale(1.01)',
        }}
      />
      
      {/* Additional purple glow layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/15 via-transparent to-violet-400/8 animate-pulse delay-500"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-400/20 to-transparent animate-pulse delay-700"></div>
      <div className="absolute inset-0 bg-gradient-radial from-purple-600/10 via-transparent to-transparent animate-pulse delay-1000"></div>
    </div>
  );
};
