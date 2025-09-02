'use client';

import { type ReactNode } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Reusable success/confirmation component for workflow completions
type DashboardSuccessProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  actionText?: string;
  actionHref?: string;
  className?: string;
};

export function DashboardSuccess({
  title = "Success!",
  description = "Your action has been completed successfully.",
  action,
  actionText = "Continue",
  actionHref = "/dashboard",
  className = ''
}: DashboardSuccessProps) {
  return (
    <Card className={`border-0 shadow-lg ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6">{description}</p>
            {action || (
              <Button onClick={() => window.location.href = actionHref}>
                {actionText}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Reusable workflow tabs component for multi-step processes
type WorkflowTabsProps = {
  currentStep: string;
  onStepChange: (step: string) => void;
  steps: Array<{
    id: string;
    label: string;
    disabled?: boolean;
  }>;
  className?: string;
};

export function WorkflowTabs({ currentStep, onStepChange, steps, className = '' }: WorkflowTabsProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="grid grid-cols-3 w-full max-w-md border rounded-lg p-1 bg-muted">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => !step.disabled && onStepChange(step.id)}
            disabled={step.disabled}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${currentStep === step.id 
                ? 'bg-background text-foreground shadow-sm' 
                : step.disabled 
                  ? 'text-muted-foreground cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }
            `}
          >
            <span className={`
              w-5 h-5 rounded-full text-xs flex items-center justify-center border
              ${currentStep === step.id 
                ? 'bg-primary text-primary-foreground border-primary'
                : step.disabled
                  ? 'border-muted-foreground/30'
                  : 'border-muted-foreground'
              }
            `}>
              {index + 1}
            </span>
            {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}