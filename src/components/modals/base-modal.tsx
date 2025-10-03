import type { ReactNode } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/ui/cn';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

type BaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
  preventScroll?: boolean;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-[425px]', // Small - Simple forms
  md: 'sm:max-w-lg', // Medium - Default (512px)
  lg: 'sm:max-w-3xl', // Large - Complex content (768px)
  xl: 'sm:max-w-5xl', // Extra Large - Pricing tables (1024px)
  full: 'sm:max-w-[90vw]', // Full - Maximum width
};

/**
 * Base Modal Component
 *
 * Reusable modal wrapper following shadcn/ui Dialog patterns
 * Provides consistent sizing, scrolling, and layout behavior
 *
 * @param open - Controls modal visibility
 * @param onOpenChange - Callback when modal visibility changes
 * @param title - Modal title (required for accessibility)
 * @param description - Optional modal description
 * @param children - Modal content
 * @param footer - Optional footer content
 * @param size - Modal size variant (sm, md, lg, xl, full)
 * @param className - Additional CSS classes
 * @param preventScroll - Disable scrolling if content is guaranteed to fit
 */
export function BaseModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  preventScroll = false,
}: BaseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          sizeClasses[size],
          'max-h-[90vh]',
          !preventScroll && 'overflow-hidden flex flex-col p-0',
          className,
        )}
      >
        <DialogHeader className={cn(!preventScroll && 'px-6 pt-6 pb-2')}>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Scrollable content area */}
        <div
          className={cn(
            'flex-1',
            !preventScroll && 'overflow-y-auto px-6',
            preventScroll && 'px-6',
          )}
        >
          {children}
        </div>

        {/* Fixed footer */}
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            {footer}
          </div>
        )}

        {!preventScroll && !footer && <div className="pb-6" />}
      </DialogContent>
    </Dialog>
  );
}
