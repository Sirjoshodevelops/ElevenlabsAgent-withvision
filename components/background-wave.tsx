"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
      <motion.video
        src="/wave-loop.mp4"
        autoPlay
        muted
        loop
        controls={false}
        className="absolute object-cover w-full h-full opacity-60 dark:opacity-40"
        style={{
          filter: 'hue-rotate(280deg) saturate(2.5) brightness(0.4) contrast(1.8)',
          boxShadow: 'inset 0 0 200px rgba(147, 51, 234, 0.3)',
        }}
      />
      <div 
        className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-purple-600/10 to-transparent"
        style={{
          background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.15) 0%, rgba(126, 34, 206, 0.08) 40%, transparent 70%)',
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(45deg, rgba(147, 51, 234, 0.1) 0%, transparent 30%, rgba(168, 85, 247, 0.05) 70%, transparent 100%)',
          filter: 'blur(1px)',
        }}
      />
    </div>
  );
};
