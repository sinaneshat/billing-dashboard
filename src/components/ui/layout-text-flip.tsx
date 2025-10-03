"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/ui/cn";

export interface LayoutTextFlipProps {
  /**
   * Static text that appears before the flipping words
   */
  text: string;
  /**
   * Array of words/phrases to cycle through
   */
  words: string[];
  /**
   * Duration in milliseconds between word transitions
   * @default 3000
   */
  duration?: number;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * LayoutTextFlip - Animated text component with rotating words
 *
 * Displays a static text followed by words that flip through with smooth animations.
 * Perfect for hero sections, landing pages, and attention-grabbing headers.
 *
 * @example
 * ```tsx
 * <LayoutTextFlip
 *   text="Collaborate with"
 *   words={["Multiple AI Models", "Expert Systems", "Smart Assistants"]}
 *   duration={3000}
 * />
 * ```
 */
export function LayoutTextFlip({
  text,
  words,
  duration = 3000,
  className,
}: LayoutTextFlipProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>
      <motion.span
        layoutId="subtext"
        className="text-2xl font-bold tracking-tight drop-shadow-lg md:text-4xl"
      >
        {text}
      </motion.span>

      <motion.span
        layout
        className="relative w-fit overflow-hidden rounded-md border bg-card px-4 py-2 font-sans text-2xl font-bold tracking-tight text-card-foreground shadow-sm ring-1 ring-border drop-shadow-lg md:text-4xl"
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={currentIndex}
            initial={{ y: -40, filter: "blur(10px)" }}
            animate={{
              y: 0,
              filter: "blur(0px)",
            }}
            exit={{ y: 50, filter: "blur(10px)", opacity: 0 }}
            transition={{
              duration: 0.5,
            }}
            className={cn("inline-block whitespace-nowrap")}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </div>
  );
}
