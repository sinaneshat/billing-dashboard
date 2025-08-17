'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type ErrorScreenProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorScreen({ error, reset }: ErrorScreenProps) {
  useEffect(() => {
    // Error logging handled by error boundary
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-lg px-4">
        <Card className="relative rounded-xl border bg-card/50 shadow-lg backdrop-blur-xl">
          <CardHeader>
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={() => reset()}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
