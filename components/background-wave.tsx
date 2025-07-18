"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
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
          filter: 'hue-rotate(280deg) saturate(2.5) brightness(1.4) contrast(1.8) blur(0px)',
          boxShadow: '0 0 120px rgba(147, 51, 234, 0.4), 0 0 240px rgba(168, 85, 247, 0.3)',
          imageRendering: 'auto',
          transform: 'scale(1.02)',
        }}
      />
      
      {/* Additional glow layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/15 via-transparent to-violet-400/8 animate-pulse delay-500"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-400/20 to-transparent animate-pulse delay-700"></div>
      <div className="absolute inset-0 bg-gradient-radial from-purple-600/10 via-transparent to-transparent animate-pulse delay-1000"></div>
    </div>
  );
};
