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
      className="fixed object-cover bottom-0 z-[1] hidden md:block pointer-events-none opacity-60 dark:opacity-40"
        className="fixed object-cover bottom-0 z-[1] w-full h-full hidden md:block pointer-events-none opacity-90"
        style={{
          filter: 'hue-rotate(200deg) saturate(3) brightness(1.2) contrast(2.5)',
          boxShadow: '0 0 100px rgba(0, 255, 255, 0.3), 0 0 200px rgba(0, 150, 255, 0.2)',
        }}
      />
      
      {/* Additional glow layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-blue-400/5 animate-pulse delay-500"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-cyan-400/15 to-transparent animate-pulse delay-700"></div>
    </div>
  );
};
