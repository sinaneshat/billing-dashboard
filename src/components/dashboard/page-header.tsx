import type { ReactNode } from 'react';
import React from 'react';

import { Separator } from '@/components/ui/separator';

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center space-x-2">{action}</div>}
      </div>
      {children}
      <Separator />
    </div>
  );
}

export function PageHeaderAction({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
