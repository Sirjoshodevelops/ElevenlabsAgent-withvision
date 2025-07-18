"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      <motion.video
        src="/wave-loop.mp4"
        autoPlay
        muted
        loop
      className="fixed object-cover bottom-0 z-[1] hidden md:block pointer-events-none opacity-60 dark:opacity-40"
        className="fixed object-cover bottom-0 z-[1] w-full h-full hidden md:block pointer-events-none opacity-100"
        style={{
          filter: 'hue-rotate(280deg) saturate(2.5) brightness(0.4) contrast(1.8)',
        }}
      />
    </div>
  );
};
