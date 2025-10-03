'use client';

import React, { useEffect, useState } from 'react';

import { motion } from 'motion/react';

import { cn } from '@/lib/ui/cn';

type Direction = 'TOP' | 'LEFT' | 'BOTTOM' | 'RIGHT';

export interface HoverBorderGradientProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  duration?: number;
  clockwise?: boolean;
  disabled?: boolean;
}

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = 'button',
  duration = 1,
  clockwise = true,
  ...props
}: HoverBorderGradientProps) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>('TOP');

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ['TOP', 'LEFT', 'BOTTOM', 'RIGHT'];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = clockwise
      ? (currentIndex - 1 + directions.length) % directions.length
      : (currentIndex + 1) % directions.length;
    return directions[nextIndex] as Direction;
  };

  const movingMap: Record<Direction, string> = {
    TOP: 'radial-gradient(20.7% 50% at 50% 0%, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0) 100%)',
    LEFT: 'radial-gradient(16.6% 43.1% at 0% 50%, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0) 100%)',
    BOTTOM:
      'radial-gradient(20.7% 50% at 50% 100%, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0) 100%)',
    RIGHT:
      'radial-gradient(16.2% 41.199999999999996% at 100% 50%, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0) 100%)',
  };

  const highlight
    = 'radial-gradient(75% 181.15942028985506% at 50% 50%, hsl(var(--primary)) 0%, hsl(var(--primary) / 0) 100%)';

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => {
        setDirection(prevState => rotateDirection(prevState));
      }, duration * 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [hovered, duration]);

  return (
    <Tag
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex h-min w-fit flex-col flex-nowrap content-center items-center justify-center gap-10 overflow-visible rounded-md border border-input bg-background/50 p-px decoration-clone transition duration-500 hover:border-primary/50',
        containerClassName,
      )}
      {...props}
    >
      <div
        className={cn(
          'z-10 w-auto rounded-[inherit] bg-background px-6 py-2 text-foreground',
          className,
        )}
      >
        {children}
      </div>
      <motion.div
        className={cn(
          'absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]',
        )}
        style={{
          filter: 'blur(2px)',
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: 'linear', duration: duration ?? 1 }}
      />
      <div className="absolute inset-[2px] z-1 flex-none rounded-[inherit] bg-background" />
    </Tag>
  );
}
