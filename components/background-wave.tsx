"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      <motion.video
        src="/wave-loop.mp4"
        autoPlay
        muted
        loop
      className="fixed object-cover bottom-0 z-[1] hidden md:block pointer-events-none opacity-60 dark:opacity-40"
        className="fixed object-cover bottom-0 z-[5] hidden md:block pointer-events-none opacity-90 dark:opacity-80"
        style={{
          filter: 'hue-rotate(280deg) saturate(2.5) brightness(0.4) contrast(1.8)',
        }}
      />
      
      {/* Purple neon glow effects */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 via-transparent to-transparent opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-600/30 via-purple-400/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/5 to-purple-800/20" />
    </div>
  );
};
