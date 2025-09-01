'use client';

import {
  BarChart3,
  ChevronRight,
  CreditCard,
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
      },
      {
        title: 'Subscriptions',
        url: '/dashboard/billing/subscriptions',
      },
      {
        title: 'Plans',
        url: '/dashboard/billing/plans',
      },
      {
        title: 'Billing History',
        url: '/dashboard/billing/payments',
      },
      {
        title: 'Direct Debit Setup',
        url: '/dashboard/billing/methods',
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isExactMatch = pathname === item.url;
                const hasActiveSubItem = item.items?.some(subItem => pathname === subItem.url);
                const shouldExpand = hasActiveSubItem || (pathname.startsWith(`${item.url}/`) && pathname !== item.url);
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
                          <SidebarMenuButton tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                            {showBadge && (
                              <Badge variant="secondary" className="ml-2">
                                Active
                              </Badge>
                            )}
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => {
                              const isSubActive = pathname === subItem.url;
                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isSubActive}
                                  >
                                    <Link href={subItem.url}>
                                      <span>{subItem.title}</span>
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
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                        {showBadge && (
                          <Badge variant="secondary" className="ml-auto">
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                <div className="ml-auto size-2 rounded-full bg-green-500" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
