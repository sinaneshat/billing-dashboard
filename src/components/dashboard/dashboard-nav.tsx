'use client';

import {
  BarChart3,
  CreditCard,
  Menu,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Dashboard overview and account information',
  },
  {
    name: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
    description: 'Subscription and payment management',
    badge: true,
  },
  {
    name: 'Subscriptions',
    href: '/dashboard/billing/subscriptions',
    icon: Package,
    description: 'Manage your active subscriptions',
    parent: 'billing',
  },
  {
    name: 'Payment History',
    href: '/dashboard/billing/payments',
    icon: Receipt,
    description: 'View payment history and receipts',
    parent: 'billing',
  },
  {
    name: 'Plans',
    href: '/dashboard/billing/plans',
    icon: ShoppingCart,
    description: 'Browse and upgrade subscription plans',
    parent: 'billing',
  },
  {
    name: 'Payment Methods',
    href: '/dashboard/billing/methods',
    icon: Settings,
    description: 'Manage payment methods and billing settings',
    parent: 'billing',
  },
];

function NavLink({ item }: { item: typeof navigation[0] }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.name === 'Billing' && pathname.startsWith('/dashboard/billing'));
  const { data: currentSubscription } = useCurrentSubscriptionQuery();

  const showBadge = item.badge && currentSubscription?.status === 'active';
  const isSubItem = item.parent;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground group',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground',
        isSubItem && 'ml-6 border-l border-border pl-4',
      )}
      title={item.description}
    >
      <div className="flex items-center gap-3">
        <item.icon className="h-4 w-4" />
        <span>{item.name}</span>
      </div>
      {showBadge && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          Active
        </Badge>
      )}
    </Link>
  );
}

function DesktopNav() {
  const mainItems = navigation.filter(item => !item.parent);
  const billingItems = navigation.filter(item => item.parent === 'billing');
  const pathname = usePathname();
  const showBillingSubItems = pathname.startsWith('/dashboard/billing');

  return (
    <nav className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:bg-card md:border-r">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Billing Dashboard</span>
            </Link>
          </div>
          <nav className="mt-2 flex-1 px-3 space-y-1">
            {mainItems.map(item => (
              <NavLink key={item.name} item={item} />
            ))}
            {showBillingSubItems && (
              <div className="pt-2 space-y-1">
                {billingItems.map(item => (
                  <NavLink key={item.name} item={item} />
                ))}
              </div>
            )}
          </nav>
        </div>
      </div>
    </nav>
  );
}

function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const mainItems = navigation.filter(item => !item.parent);
  const billingItems = navigation.filter(item => item.parent === 'billing');
  const pathname = usePathname();
  const showBillingSubItems = pathname.startsWith('/dashboard/billing');

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/dashboard" onClick={handleNavClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold">Billing Dashboard</span>
              </Link>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {mainItems.map(item => (
                <div
                  key={item.name}
                  onClick={handleNavClick}
                  onKeyDown={e => e.key === 'Enter' && handleNavClick()}
                  role="button"
                  tabIndex={0}
                >
                  <NavLink item={item} />
                </div>
              ))}
              {showBillingSubItems && (
                <div className="pt-2 space-y-1 border-t border-border mt-2">
                  {billingItems.map(item => (
                    <div
                      key={item.name}
                      onClick={handleNavClick}
                      onKeyDown={e => e.key === 'Enter' && handleNavClick()}
                      role="button"
                      tabIndex={0}
                    >
                      <NavLink item={item} />
                    </div>
                  ))}
                </div>
              )}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function DashboardNav() {
  return (
    <>
      <DesktopNav />
      <MobileNav />
    </>
  );
}
