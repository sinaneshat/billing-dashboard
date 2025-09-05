'use client';

import {
  BarChart3,
  ChevronRight,
  CreditCard,
  LogOut,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsPanel } from '@/components/ui/settings-panel';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { BRAND } from '@/constants/brand';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { signOut, useSession } from '@/lib/auth/client';

// Navigation structure function to enable translations
function getNavigation(t: ReturnType<typeof useTranslations>) {
  return [
    {
      titleKey: 'navigation.overview',
      title: t('navigation.overview'),
      url: '/dashboard',
      icon: BarChart3,
    },
    {
      titleKey: 'navigation.billing',
      title: t('navigation.billing'),
      url: '/dashboard/billing',
      icon: CreditCard,
      badge: 'subscription',
      forceExpanded: true, // Keep billing section expanded by default
      items: [
        {
          titleKey: 'navigation.subscriptions',
          title: t('navigation.subscriptions'),
          url: '/dashboard/billing/subscriptions',
        },
        {
          titleKey: 'navigation.plans',
          title: t('navigation.plans'),
          url: '/dashboard/billing/plans',
        },
        {
          titleKey: 'navigation.billingHistory',
          title: t('navigation.billingHistory'),
          url: '/dashboard/billing/payments',
        },
        {
          titleKey: 'navigation.paymentMethods',
          title: t('navigation.paymentMethods'),
          url: '/dashboard/billing/methods',
        },
      ],
    },
  ];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: currentSubscription } = useCurrentSubscriptionQuery();
  const { isMobile } = useSidebar();
  const t = useTranslations();

  const navigation = getNavigation(t);

  const user = session?.user;
  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const hasActiveSubscription = currentSubscription?.status === 'active';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon" side="start" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center">
                  {/* Roundtable Logo */}
                  <Image
                    src="/static/logo.svg"
                    alt="Roundtable Logo"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{BRAND.name}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">{BRAND.tagline}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isExactMatch = pathname === item.url;
                const hasActiveSubItem = item.items?.some(subItem => pathname === subItem.url);
                const shouldExpand = item.forceExpanded || hasActiveSubItem || (pathname.startsWith(`${item.url}/`) && pathname !== item.url);
                const showBadge = item.badge === 'subscription' && hasActiveSubscription;

                if (item.items) {
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={shouldExpand || item.forceExpanded}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                            {showBadge && (
                              <Badge variant="secondary" className="ms-2">
                                {t('status.active')}
                              </Badge>
                            )}
                            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:scale-x-[-1]" />
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
                          <Badge variant="secondary" className="ms-auto">
                            {t('status.active')}
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
          {/* Unified Settings Panel */}
          <SidebarMenuItem>
            <SettingsPanel variant="sidebar" />
          </SidebarMenuItem>

          {/* User Profile Dropdown */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.image || undefined} alt={user?.name || t('user.defaultName')} />
                    <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || t('user.defaultName')}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
                  </div>
                  {hasActiveSubscription && (
                    <div className="ms-auto size-2 rounded-full bg-green-500" />
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.image || undefined} alt={user?.name || t('user.defaultName')} />
                      <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-start text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name || t('user.defaultName')}</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {t('navigation.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
