'use client';

import { Check } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/ui/cn';

export interface StepIndicatorProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'current' | 'completed';
  }>;
  className?: string;
}

export function StepIndicator({ steps, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';

        return (
          <div key={step.id} className="flex items-center flex-shrink-0">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium',
                  {
                    'border-primary bg-primary text-primary-foreground': isCompleted,
                    'border-primary bg-background text-primary': isCurrent,
                    'border-muted-foreground bg-background text-muted-foreground': step.status === 'pending',
                  }
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step Title */}
              <div className="mt-2 text-center min-w-0 max-w-24">
                <div
                  className={cn(
                    'text-xs sm:text-sm font-medium truncate',
                    {
                      'text-foreground': isCompleted || isCurrent,
                      'text-muted-foreground': step.status === 'pending',
                    }
                  )}
                >
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {step.description}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn(
                  'mx-4 h-0.5 w-12',
                  {
                    'bg-primary': isCompleted,
                    'bg-muted': !isCompleted,
                  }
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}