'use client';

import { motion } from 'motion/react';
import React, { useMemo } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/ui/cn';

// Enhanced skeleton with animation variants
interface AnimatedSkeletonProps {
  className?: string;
  variant?: 'pulse' | 'wave' | 'shimmer';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function AnimatedSkeleton({
  className,
  variant = 'pulse',
  children,
  style,
}: AnimatedSkeletonProps) {
  const animation = useMemo(() => {
    switch (variant) {
      case 'wave':
        return {
          scale: [1, 1.02, 1],
          transition: {
            duration: 1.5,
            repeat: Infinity,
          },
        };
      case 'shimmer':
        return {
          x: ['-100%', '100%'],
          transition: {
            duration: 2,
            repeat: Infinity,
          },
        };
      default:
        return {
          opacity: [0.5, 1, 0.5],
          transition: {
            duration: 1.5,
            repeat: Infinity,
          },
        };
    }
  }, [variant]);

  if (variant === 'shimmer') {
    return (
      <div className={cn('relative overflow-hidden rounded', className)} style={style}>
        <Skeleton className="w-full h-full" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={animation}
        />
        {children}
      </div>
    );
  }

  return (
    <motion.div animate={animation} style={style}>
      <Skeleton className={className} />
      {children}
    </motion.div>
  );
}

// Table loading skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Table header */}
      {showHeader && (
        <div className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }, (_, i) => (
            <AnimatedSkeleton 
              key={i} 
              className="h-4 flex-1" 
              variant="shimmer" 
            />
          ))}
        </div>
      )}
      
      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <AnimatedSkeleton 
                key={colIndex} 
                className={cn(
                  'h-4',
                  colIndex === 0 ? 'w-24' : 'flex-1'
                )}
                variant="pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Card grid skeleton
interface CardGridSkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
  variant?: 'default' | 'detailed' | 'compact';
}

export function CardGridSkeleton({ 
  count = 6, 
  columns = 3,
  className,
  variant = 'default',
}: CardGridSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns as keyof typeof gridCols] || 'grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}

// Individual card skeleton
interface CardSkeletonProps {
  className?: string;
  variant?: 'default' | 'detailed' | 'compact';
  showImage?: boolean;
  showActions?: boolean;
}

export function CardSkeleton({ 
  className,
  variant = 'default',
  showImage = false,
  showActions = true,
}: CardSkeletonProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {showImage && (
        <AnimatedSkeleton className="w-full h-48" variant="shimmer" />
      )}
      
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <AnimatedSkeleton className="h-5 w-3/4" />
            {variant !== 'compact' && (
              <AnimatedSkeleton className="h-4 w-1/2" />
            )}
          </div>
          {showActions && (
            <AnimatedSkeleton className="h-6 w-16 rounded-md" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {variant === 'detailed' && (
          <>
            <div className="space-y-2">
              <AnimatedSkeleton className="h-4 w-full" />
              <AnimatedSkeleton className="h-4 w-4/5" />
              <AnimatedSkeleton className="h-4 w-3/5" />
            </div>
            
            <div className="flex gap-2 pt-2">
              <AnimatedSkeleton className="h-8 flex-1" />
              <AnimatedSkeleton className="h-8 w-8" />
            </div>
          </>
        )}
        
        {variant === 'default' && (
          <>
            <div className="flex justify-between items-center">
              <AnimatedSkeleton className="h-6 w-20" />
              <AnimatedSkeleton className="h-4 w-16" />
            </div>
            
            <AnimatedSkeleton className="h-2 w-full" />
            
            <div className="flex gap-2">
              <AnimatedSkeleton className="h-8 flex-1" />
              <AnimatedSkeleton className="h-8 w-8" />
            </div>
          </>
        )}
        
        {variant === 'compact' && (
          <div className="flex justify-between items-center">
            <AnimatedSkeleton className="h-4 w-24" />
            <AnimatedSkeleton className="h-6 w-12 rounded-md" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// List skeleton
interface ListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}

export function ListSkeleton({ 
  count = 5,
  showAvatar = true,
  showActions = true,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          {showAvatar && (
            <AnimatedSkeleton className="h-10 w-10 rounded-full shrink-0" />
          )}
          
          <div className="space-y-2 flex-1">
            <AnimatedSkeleton className="h-4 w-1/3" />
            <AnimatedSkeleton className="h-3 w-1/2" />
          </div>
          
          {showActions && (
            <div className="flex gap-2 shrink-0">
              <AnimatedSkeleton className="h-8 w-8 rounded" />
              <AnimatedSkeleton className="h-8 w-8 rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Chart skeleton
interface ChartSkeletonProps {
  type?: 'bar' | 'line' | 'pie' | 'area';
  height?: number;
  className?: string;
}

export function ChartSkeleton({ 
  type = 'line',
  height = 300,
  className,
}: ChartSkeletonProps) {
  return (
    <div 
      className={cn('border rounded-lg p-4', className)}
      style={{ height }}
    >
      <div className="space-y-4 h-full">
        {/* Chart title */}
        <div className="flex justify-between items-center">
          <AnimatedSkeleton className="h-5 w-32" />
          <AnimatedSkeleton className="h-4 w-20" />
        </div>
        
        {/* Chart area */}
        <div className="flex-1 relative">
          {type === 'pie' ? (
            <div className="flex items-center justify-center h-full">
              <AnimatedSkeleton className="h-40 w-40 rounded-full" variant="shimmer" />
            </div>
          ) : (
            <div className="h-full flex items-end gap-2">
              {Array.from({ length: type === 'bar' ? 8 : 12 }, (_, i) => (
                <AnimatedSkeleton
                  key={i}
                  className="flex-1"
                  style={{ 
                    height: `${Math.random() * 60 + 20}%`,
                    borderRadius: type === 'bar' ? '4px 4px 0 0' : '0',
                  }}
                  variant="wave"
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 justify-center">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <AnimatedSkeleton className="h-3 w-3 rounded-sm" />
              <AnimatedSkeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Chat skeleton
interface ChatSkeletonProps {
  showSidebar?: boolean;
  showHeader?: boolean;
  className?: string;
}

export function ChatSkeleton({
  showSidebar = true,
  showHeader = true,
  className,
}: ChatSkeletonProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Header */}
      {showHeader && (
        <div className="border-b p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <AnimatedSkeleton className="h-8 w-32" />
              <AnimatedSkeleton className="h-6 w-6 rounded" />
            </div>
            
            <div className="flex items-center gap-3">
              <AnimatedSkeleton className="h-8 w-8 rounded-full" />
              <AnimatedSkeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 border-r p-4 space-y-4">
            <AnimatedSkeleton className="h-8 w-full" />
            
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <AnimatedSkeleton className="h-4 w-4" />
                  <AnimatedSkeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Main content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-2">
                  <AnimatedSkeleton className="h-4 w-20" />
                  <AnimatedSkeleton className="h-8 w-16" />
                  <AnimatedSkeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Chart section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton type="line" />
            <ChartSkeleton type="bar" />
          </div>
          
          {/* Table section */}
          <Card>
            <CardHeader>
              <AnimatedSkeleton className="h-6 w-48" />
              <AnimatedSkeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={8} columns={5} showHeader={false} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Text skeleton with different sizes
interface TextSkeletonProps {
  lines?: number;
  className?: string;
  variant?: 'paragraph' | 'title' | 'subtitle';
}

export function TextSkeleton({ 
  lines = 3,
  className,
  variant = 'paragraph',
}: TextSkeletonProps) {
  const getLineHeight = (index: number) => {
    if (variant === 'title') {
      return index === 0 ? 'h-8' : 'h-6';
    }
    if (variant === 'subtitle') {
      return index === 0 ? 'h-6' : 'h-4';
    }
    return 'h-4';
  };

  const getLineWidth = (index: number) => {
    if (index === lines - 1) return 'w-3/4'; // Last line shorter
    if (index === 0 && variant !== 'paragraph') return 'w-1/2'; // Title shorter
    return 'w-full';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <AnimatedSkeleton
          key={i}
          className={cn(getLineHeight(i), getLineWidth(i))}
          variant="pulse"
        />
      ))}
    </div>
  );
}

