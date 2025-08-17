'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type ErrorMessageProps = {
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
  fullPage?: boolean;
};

export function ErrorMessage({
  title = 'Something went wrong',
  description = 'An error occurred. Please try again later.',
  showRetry = false,
  onRetry,
  className,
  fullPage = false,
}: ErrorMessageProps) {
  const router = useRouter();
  const ErrorContent = (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        {description}
        {showRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                router.refresh();
              }
            }}
            className="w-fit"
          >
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-none">
          {ErrorContent}
        </Card>
      </div>
    );
  }

  return ErrorContent;
}

