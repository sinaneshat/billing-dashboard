'use client';

import { CreditCard, LogOut, Package, Settings } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';

type DashboardHeaderProps = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    emailVerified?: boolean | null;
  };
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const { data: currentSubscription } = useCurrentSubscriptionQuery();
  const hasActiveSubscription = currentSubscription?.status === 'active';

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Spacer for header alignment */}
        <div className="flex-1"></div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Billing Quick Action */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/billing">
              <CreditCard className="h-4 w-4" />
            </Link>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
                  <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                </Avatar>
                {/* Show subscription status indicator */}
                {hasActiveSubscription && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.emailVerified && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">Verified</span>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>

              {/* Subscription Status */}
              <DropdownMenuLabel className="font-normal pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Subscription</span>
                  {currentSubscription
                    ? (
                        <Badge variant={hasActiveSubscription ? 'default' : 'secondary'} className="text-xs">
                          {currentSubscription.status}
                        </Badge>
                      )
                    : (
                        <Badge variant="outline" className="text-xs">
                          No Plan
                        </Badge>
                      )}
                </div>
                {currentSubscription?.product?.name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentSubscription.product.name}
                  </p>
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Billing Menu Items */}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Billing Overview</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing/subscriptions" className="cursor-pointer">
                  <Package className="mr-2 h-4 w-4" />
                  <span>Manage Subscriptions</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing/methods" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Payment Methods</span>
                </Link>
              </DropdownMenuItem>

              {!hasActiveSubscription && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/billing/plans" className="cursor-pointer text-blue-600">
                    <Package className="mr-2 h-4 w-4" />
                    <span>Choose a Plan</span>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/auth/sign-out" className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
