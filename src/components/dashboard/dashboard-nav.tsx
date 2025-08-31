'use client';

import {
  BarChart3,
  CreditCard,
  Menu,
  Package,
  Settings,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Dashboard overview and key metrics',
  },
  {
    name: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: Package,
    description: 'Manage your active subscriptions',
  },
  {
    name: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
    description: 'Payment methods and billing history',
  },
  {
    name: 'Plans',
    href: '/dashboard/plans',
    icon: User,
    description: 'Browse and subscribe to plans',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Account settings and preferences',
  },
];

function NavLink({ item }: { item: typeof navigation[0] }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground',
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.name}</span>
    </Link>
  );
}

function DesktopNav() {
  return (
    <nav className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:bg-card md:border-r">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Billing</span>
            </div>
          </div>
          <nav className="mt-2 flex-1 px-3 space-y-1">
            {navigation.map(item => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>
    </nav>
  );
}

function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold">Billing</span>
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map(item => (
                <div
                  key={item.name}
                  onClick={() => setIsOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsOpen(false);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <NavLink item={item} />
                </div>
              ))}
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
