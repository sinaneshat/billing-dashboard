/**
 * React Hook for Text Direction Detection
 * Real-time direction detection with debouncing and optimization
 */

import { useCallback, useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import type { TextDirectionConfig } from '@/utils/text-direction';
import { detectTextDirection } from '@/utils/text-direction';

export type UseTextDirectionOptions = {
  debounceMs?: number;
  initialText?: string;
} & TextDirectionConfig;

export function useTextDirection(
  text: string = '',
  options: UseTextDirectionOptions = {},
) {
  const {
    debounceMs = 300,
    threshold = 0.2,
    useCaching = true,
    includeNumbers = false,
    initialText = '',
  } = options;

  const [direction, setDirection] = useState<'rtl' | 'ltr' | 'neutral'>('neutral');
  const [isDetecting, setIsDetecting] = useState(false);

  // Debounced detection to avoid excessive computations
  const debouncedDetection = useDebouncedCallback(
    useCallback((inputText: string) => {
      const updateState = () => {
        setIsDetecting(true);

        const detected = detectTextDirection(inputText, {
          threshold,
          useCaching,
          includeNumbers,
        });

        setDirection(detected);
        setIsDetecting(false);
      };

      updateState();
    }, [threshold, useCaching, includeNumbers]),
    debounceMs,
  );

  // Effect to trigger detection when text changes
  useEffect(() => {
    const performDetection = () => {
      if (text.trim()) {
        debouncedDetection(text);
      } else if (initialText.trim()) {
        debouncedDetection(initialText);
      } else {
        const resetState = () => {
          setDirection('neutral');
          setIsDetecting(false);
        };
        resetState();
      }
    };

    performDetection();
  }, [text, initialText, debouncedDetection]);

  // Immediate detection for simple cases (single words)
  const detectImmediately = useCallback((inputText: string) => {
    const detected = detectTextDirection(inputText, {
      threshold,
      useCaching,
      includeNumbers,
    });
    setDirection(detected);
    return detected;
  }, [threshold, useCaching, includeNumbers]);

  return {
    direction,
    isDetecting,
    detectImmediately,
    isRTL: direction === 'rtl',
    isLTR: direction === 'ltr',
    isNeutral: direction === 'neutral',
  };
}

/**
 * Hook for managing input field direction with real-time detection
 */
export function useInputDirection(initialValue: string = '') {
  const [value, setValue] = useState(initialValue);
  const { direction, isDetecting } = useTextDirection(value, {
    debounceMs: 200,
    threshold: 0.15, // Lower threshold for input fields
  });

  const updateValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const resetValue = useCallback(() => {
    setValue('');
  }, []);

  return {
    value,
    setValue: updateValue,
    resetValue,
    direction,
    isDetecting,
    isRTL: direction === 'rtl',
    isLTR: direction === 'ltr',
    directionClass: direction === 'rtl' ? 'text-right' : 'text-left',
  };
}

/**
 * Hook for managing form field directions across multiple inputs
 */
export function useFormDirection() {
  const [fieldDirections, setFieldDirections] = useState<Record<string, 'rtl' | 'ltr' | 'neutral'>>({});

  const updateFieldDirection = useCallback((fieldName: string, text: string) => {
    const direction = detectTextDirection(text, { threshold: 0.15 });
    setFieldDirections(prev => ({
      ...prev,
      [fieldName]: direction,
    }));
    return direction;
  }, []);

  const getFieldDirection = useCallback((fieldName: string) => {
    return fieldDirections[fieldName] || 'neutral';
  }, [fieldDirections]);

  const clearFieldDirections = useCallback(() => {
    setFieldDirections({});
  }, []);

  return {
    fieldDirections,
    updateFieldDirection,
    getFieldDirection,
    clearFieldDirections,
  };
}
