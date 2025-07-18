"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden bg-white dark:bg-gray-900">
      {/* Enhanced glow effects */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/20 via-blue-600/10 to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-pulse delay-1000"></div>
      
      <motion.video
        src="/wave-loop.mp4"
        autoPlay
        muted
        loop
        className="fixed object-cover bottom-0 z-[1] w-full h-full hidden md:block pointer-events-none opacity-90"
        className="fixed object-cover bottom-0 z-[1] w-full h-full hidden md:block pointer-events-none opacity-90"
        style={{
          filter: 'hue-rotate(320deg) saturate(3.5) brightness(1.8) contrast(2.2)',
          boxShadow: '0 0 120px rgba(168, 85, 247, 0.8), 0 0 240px rgba(147, 51, 234, 0.6), 0 0 360px rgba(139, 69, 255, 0.4)',
          imageRendering: 'auto',
          transform: 'scale(1.02)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 via-violet-600/10 to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/15 to-transparent animate-pulse delay-1000"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-purple-600/25 via-transparent to-violet-500/15 animate-pulse delay-500"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-500/30 to-transparent animate-pulse delay-700"></div>
      <div className="absolute inset-0 bg-gradient-radial from-violet-400/15 via-purple-600/8 to-transparent animate-pulse delay-300"></div>
      <div className="absolute inset-0 bg-gradient-radial from-purple-600/10 via-transparent to-transparent animate-pulse delay-1000"></div>
    </div>
  );
};
