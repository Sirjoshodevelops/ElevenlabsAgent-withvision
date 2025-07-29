"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <motion.video
      src="https://storage.googleapis.com/msgsndr/HOwttIKa3lqR9YAr7GIq/media/6888c425fe5a779f8a5b2a11.mov"
      autoPlay
      muted
      loop
      controls={false}
      preload="auto"
      className="fixed inset-0 w-full h-full object-cover z-[-1] pointer-events-none opacity-75"
      style={{
        filter: 'brightness(0.3) contrast(1.2)',
      }}
    />
  );
};