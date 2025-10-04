'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';

const loadingMessages = [
  'Setting up your account...',
  'Organizing your workspace...',
  'Getting everything ready...',
  'Almost there...',
];

export default function AuthCallbackScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-primary opacity-20" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-foreground animate-pulse">
              {loadingMessages[messageIndex]}
            </p>
            <p className="text-xs text-muted-foreground">
              Please wait while we complete your authentication
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
