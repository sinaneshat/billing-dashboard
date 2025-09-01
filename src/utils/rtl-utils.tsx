/**
 * RTL Utility Functions
 * Higher-order components and utilities for RTL support
 */

'use client';

import React from 'react';

/**
 * Higher-order component for automatic text direction detection
 */
export function withBidiText<P extends { children: string }>(
  Component: React.ComponentType<P>,
) {
  const WrappedComponent = (props: P) => {
    const { children, ...otherProps } = props;
    // eslint-disable-next-line ts/no-explicit-any
    const [BidiText, setBidiText] = React.useState<React.ComponentType<any> | null>(null);

    React.useEffect(() => {
      import('@/components/rtl/bidi-text').then((module) => {
        setBidiText(module.BidiText);
      }).catch(() => {
        // Fallback if import fails
        setBidiText(null);
      });
    }, []);

    if (!BidiText) {
      return (
        <Component {...(otherProps as P)}>
          {children}
        </Component>
      );
    }

    return (
      <BidiText>
        <Component {...(otherProps as P)}>
          {children}
        </Component>
      </BidiText>
    );
  };

  WrappedComponent.displayName = `withBidiText(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * HOC to wrap components with RTL support
 */
export function withRTL<P extends object>(Component: React.ComponentType<P>) {
  const WrappedComponent = (props: P) => {
    // eslint-disable-next-line ts/no-explicit-any
    const [RTLProvider, setRTLProvider] = React.useState<React.ComponentType<any> | null>(null);

    React.useEffect(() => {
      import('@/components/rtl/rtl-provider').then((module) => {
        setRTLProvider(module.RTLProvider);
      }).catch(() => {
        // Fallback if import fails
        setRTLProvider(null);
      });
    }, []);

    if (!RTLProvider) {
      return <Component {...props} />;
    }

    return (
      <RTLProvider>
        <Component {...props} />
      </RTLProvider>
    );
  };

  WrappedComponent.displayName = `withRTL(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
