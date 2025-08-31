'use client';

import {
  BarChart3,
  ChevronDown,
  CreditCard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';

// Navigation structure
const navigation = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: BarChart3,
  },
  {
    title: 'Billing',
    url: '/dashboard/billing',
    icon: CreditCard,
    badge: 'subscription',
    items: [
      {
        title: 'Overview',
        url: '/dashboard/billing',
        icon: CreditCard,
      },
      {
        title: 'Subscriptions',
        url: '/dashboard/billing/subscriptions',
        icon: Package,
      },
      {
        title: 'Plans',
        url: '/dashboard/billing/plans',
        icon: ShoppingCart,
      },
      {
        title: 'Payment History',
        url: '/dashboard/billing/payments',
        icon: Receipt,
      },
      {
        title: 'Payment Methods',
        url: '/dashboard/billing/methods',
        icon: Settings,
      },
    ],
  },
];

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}) {
  const pathname = usePathname();
  const { data: currentSubscription } = useCurrentSubscriptionQuery();

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const hasActiveSubscription = currentSubscription?.status === 'active';

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="w-full">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CreditCard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Billing Dashboard</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Manage your subscriptions</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-auto">
        <SidebarGroup className="px-0">
          <SidebarGroupLabel className="px-2 pb-2 text-xs font-medium text-sidebar-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigation.map((item) => {
                // More precise active state detection
                const isExactMatch = pathname === item.url;
                const hasActiveSubItem = item.items?.some(subItem => pathname === subItem.url);
                const isParentActive = hasActiveSubItem || (pathname.startsWith(`${item.url}/`) && pathname !== item.url);
                const shouldExpand = hasActiveSubItem || isParentActive;
                const showBadge = item.badge === 'subscription' && hasActiveSubscription;

                if (item.items) {
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={shouldExpand}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={false} // Parent items should not be highlighted
                            className="w-full px-2 transition-colors hover:bg-sidebar-accent text-sidebar-foreground/90 hover:text-sidebar-foreground"
                          >
                            <item.icon className="size-4" />
                            <span className="flex-1 text-left">{item.title}</span>
                            {showBadge && (
                              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                                Active
                              </Badge>
                            )}
                            <ChevronDown className="ml-2 size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <SidebarMenuSub className="mx-0 px-0">
                            {item.items.map((subItem) => {
                              const isSubActive = pathname === subItem.url;
                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isSubActive}
                                    className={`w-full transition-colors ${
                                      isSubActive
                                        ? 'bg-sidebar-primary/10 text-sidebar-primary border-r-2 border-sidebar-primary font-medium'
                                        : 'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground'
                                    }`}
                                  >
                                    <Link href={subItem.url} className="flex items-center gap-2 px-2">
                                      <subItem.icon className="size-4" />
                                      <span className="flex-1 text-left">{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isExactMatch}
                      className={`w-full px-2 transition-colors ${
                        isExactMatch
                          ? 'bg-sidebar-primary/10 text-sidebar-primary border-r-2 border-sidebar-primary font-medium'
                          : 'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground'
                      }`}
                    >
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        <span className="flex-1 text-left">{item.title}</span>
                        {showBadge && (
                          <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                            Active
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="w-full px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
                <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user?.name || 'User'}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
              </div>
              {hasActiveSubscription && (
                <div className="ml-2 size-2 rounded-full bg-green-500" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
