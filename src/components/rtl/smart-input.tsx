/* eslint-disable regexp/no-obscure-range */
/**
 * Smart Input Component with Automatic RTL Detection
 * Input field that automatically detects text direction and adjusts styling
 */

'use client';

import type { InputHTMLAttributes } from 'react';
import React, { useEffect, useMemo, useState } from 'react';

import { useRTL } from '@/hooks/use-rtl';
import { useInputDirection } from '@/hooks/use-text-direction';
import { cn } from '@/lib/utils';

export type SmartInputProps = {
  autoDirection?: boolean;
  onDirectionChange?: (direction: 'rtl' | 'ltr' | 'neutral') => void;
  persianNumbers?: boolean;
  forcedDirection?: 'rtl' | 'ltr' | 'auto';
  onChange?: (e: React.ChangeEvent<HTMLInputElement>, direction: 'rtl' | 'ltr' | 'neutral') => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>;

export function SmartInput({ ref, className, autoDirection = true, onDirectionChange, persianNumbers = false, forcedDirection = 'auto', onChange, defaultValue, value: controlledValue, ...props }: SmartInputProps & { ref?: React.RefObject<HTMLInputElement | null> }) {
  const { isRTL: contextIsRTL } = useRTL();
  const [internalValue, setInternalValue] = useState(defaultValue?.toString() || '');

  // Use controlled value if provided, otherwise use internal state
  const displayValue = controlledValue !== undefined ? controlledValue.toString() : internalValue;

  const {
    direction,
    isDetecting,
  } = useInputDirection(displayValue);

  // Determine final direction
  const finalDirection = forcedDirection !== 'auto'
    ? forcedDirection
    : direction === 'neutral' ? (contextIsRTL ? 'rtl' : 'ltr') : direction;

  // Notify parent component of direction changes
  useEffect(() => {
    if (autoDirection && onDirectionChange) {
      onDirectionChange(direction);
    }
  }, [direction, autoDirection, onDirectionChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Convert Persian digits to English if needed (for numeric inputs)
    let processedValue = newValue;
    if (props.type === 'number' || props.inputMode === 'numeric') {
      // Convert Persian/Arabic digits to English digits
      processedValue = newValue
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

      // Update the input value
      e.target.value = processedValue;
    }

    // Update internal state if not controlled
    if (controlledValue === undefined) {
      setInternalValue(processedValue);
    }

    // Call onChange with direction info
    if (onChange) {
      onChange(e, direction);
    }
  };

  // Format displayed value for Persian numbers
  const formattedValue = useMemo(() => {
    if (!persianNumbers || finalDirection !== 'rtl')
      return displayValue;

    return displayValue.replace(/\d/g, (digit) => {
      const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return persianDigits[Number.parseInt(digit, 10)] || digit;
    });
  }, [displayValue, persianNumbers, finalDirection]);

  return (
    <input
      ref={ref}
      dir={finalDirection}
      value={props.type === 'number' ? displayValue : formattedValue}
      className={cn(
        // Base input styles
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
        'text-sm ring-offset-background file:border-0 file:bg-transparent',
        'file:text-sm file:font-medium placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',

        // Direction-specific styles
        {
          'persian-text rtl-input': finalDirection === 'rtl',
          'ltr-input': finalDirection === 'ltr',
          'text-right': finalDirection === 'rtl',
          'text-left': finalDirection === 'ltr',
          'persian-numbers': persianNumbers && finalDirection === 'rtl',
          'auto-direction': forcedDirection === 'auto',
        },

        // Loading state for direction detection
        {
          'opacity-75': isDetecting,
        },

        className,
      )}
      onChange={handleChange}
      {...props}
    />
  );
}

SmartInput.displayName = 'SmartInput';

/**
 * Smart Textarea Component with RTL Support
 */
export type SmartTextareaProps = {
  autoDirection?: boolean;
  onDirectionChange?: (direction: 'rtl' | 'ltr' | 'neutral') => void;
  persianNumbers?: boolean;
  forcedDirection?: 'rtl' | 'ltr' | 'auto';
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>, direction: 'rtl' | 'ltr' | 'neutral') => void;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>;

export function SmartTextarea({ ref, className, autoDirection = true, onDirectionChange, persianNumbers = false, forcedDirection = 'auto', onChange, defaultValue, value: controlledValue, ...props }: SmartTextareaProps & { ref?: React.RefObject<HTMLTextAreaElement | null> }) {
  const { isRTL: contextIsRTL } = useRTL();
  const [internalValue, setInternalValue] = useState(defaultValue?.toString() || '');

  const displayValue = controlledValue !== undefined ? controlledValue.toString() : internalValue;

  const {
    direction,
    isDetecting,
  } = useInputDirection(displayValue);

  const finalDirection = forcedDirection !== 'auto'
    ? forcedDirection
    : direction === 'neutral' ? (contextIsRTL ? 'rtl' : 'ltr') : direction;

  useEffect(() => {
    if (autoDirection && onDirectionChange) {
      onDirectionChange(direction);
    }
  }, [direction, autoDirection, onDirectionChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }

    if (onChange) {
      onChange(e, direction);
    }
  };

  const formattedValue = useMemo(() => {
    if (!persianNumbers || finalDirection !== 'rtl')
      return displayValue;

    return displayValue.replace(/\d/g, (digit) => {
      const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return persianDigits[Number.parseInt(digit, 10)] || digit;
    });
  }, [displayValue, persianNumbers, finalDirection]);

  return (
    <textarea
      ref={ref}
      dir={finalDirection}
      value={formattedValue}
      className={cn(
        // Base textarea styles
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2',
        'text-sm ring-offset-background placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        'resize-vertical',

        // Direction-specific styles
        {
          'persian-text rtl-input': finalDirection === 'rtl',
          'ltr-input': finalDirection === 'ltr',
          'text-right': finalDirection === 'rtl',
          'text-left': finalDirection === 'ltr',
          'persian-numbers': persianNumbers && finalDirection === 'rtl',
          'auto-direction': forcedDirection === 'auto',
        },

        // Loading state
        {
          'opacity-75': isDetecting,
        },

        className,
      )}
      onChange={handleChange}
      {...props}
    />
  );
}

SmartTextarea.displayName = 'SmartTextarea';

/**
 * Direction Indicator Component
 * Shows the detected direction for debugging/testing
 */
export type DirectionIndicatorProps = {
  direction: 'rtl' | 'ltr' | 'neutral';
  isDetecting?: boolean;
  className?: string;
};

export function DirectionIndicator({
  direction,
  isDetecting = false,
  className,
}: DirectionIndicatorProps) {
  const getIndicatorText = () => {
    if (isDetecting)
      return 'Detecting...';
    switch (direction) {
      case 'rtl': return 'RTL (فارسی)';
      case 'ltr': return 'LTR (English)';
      case 'neutral': return 'Neutral';
      default: return 'Unknown';
    }
  };

  const getIndicatorColor = () => {
    switch (direction) {
      case 'rtl': return 'text-blue-600 bg-blue-50';
      case 'ltr': return 'text-green-600 bg-green-50';
      case 'neutral': return 'text-gray-600 bg-gray-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
        getIndicatorColor(),
        { 'animate-pulse': isDetecting },
        className,
      )}
    >
      {getIndicatorText()}
    </div>
  );
}
