'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

type ChatContentWrapperProps = {
  children: ReactNode;
};

export function ChatContentWrapper({ children }: ChatContentWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
