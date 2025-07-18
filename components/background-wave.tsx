"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
      <motion.video
        src="/wave-loop.mp4"
        autoPlay
        muted
        loop
      className="fixed object-cover bottom-0 z-[1] hidden md:block pointer-events-none opacity-60 dark:opacity-40"
        className="fixed object-cover bottom-0 z-[5] hidden md:block pointer-events-none opacity-80 dark:opacity-60"
        style={{
          filter: 'hue-rotate(280deg) saturate(2.5) brightness(0.4) contrast(1.8)',
          boxShadow: 'inset 0 0 200px rgba(147, 51, 234, 0.3)',
        }}
      />
    </div>
  );
};
