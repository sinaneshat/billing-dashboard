'use client';

import { Plus, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { ChatList } from '@/components/chat/chat-list';
import { CommandSearch } from '@/components/chat/command-search';
import { NavUser } from '@/components/chat/nav-user';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BRAND } from '@/constants/brand';
import type { Chat } from '@/lib/types/chat';
import { groupChatsByPeriod, mockChats } from '@/lib/types/chat';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const t = useTranslations();
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut to open search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewChat = () => {
    router.push('/chat');
  };

  const handleDeleteChat = (chatId: string) => {
    // TODO: Implement delete chat functionality
    console.warn('Delete chat:', chatId);
    setChats(chats.filter(chat => chat.id !== chatId));
  };

  const handleToggleFavorite = (chatId: string) => {
    setChats(chats.map(chat =>
      chat.id === chatId ? { ...chat, isFavorite: !chat.isFavorite } : chat,
    ));
  };

  // Get favorites from chats
  const favorites = useMemo(() =>
    chats.filter(chat => chat.isFavorite), [chats]);

  // Get non-favorite chats for grouping
  const nonFavoriteChats = useMemo(() =>
    chats.filter(chat => !chat.isFavorite), [chats]);

  const chatGroups = groupChatsByPeriod(nonFavoriteChats);

  return (
    <>
      <TooltipProvider>
        <Sidebar collapsible="icon" {...props}>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link href="/chat">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                      <Image
                        src="/static/logo.png"
                        alt={t('brand.logoAlt')}
                        width={32}
                        height={32}
                        className="size-6 object-contain"
                      />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{BRAND.name}</span>
                      <span className="truncate text-xs">{BRAND.tagline}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* New Chat Button - Visible in both expanded and collapsed states */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleNewChat} tooltip={t('navigation.newChat')}>
                  <Plus className="size-4" />
                  <span>{t('navigation.newChat')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* Search Button - Only visible when expanded */}
            <SidebarGroup className="py-0 group-data-[collapsible=icon]:hidden">
              <Button
                variant="outline"
                className="w-full justify-start text-sm text-muted-foreground h-9"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="size-4 mr-2" />
                <span className="flex-1 text-left">{t('chat.searchChats')}</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>
                  K
                </kbd>
              </Button>
            </SidebarGroup>
          </SidebarHeader>

          <SidebarContent>
            <ChatList
              chatGroups={chatGroups}
              favorites={favorites}
              onDeleteChat={handleDeleteChat}
              onToggleFavorite={handleToggleFavorite}
              searchTerm=""
            />
          </SidebarContent>

          <SidebarFooter>
            <NavUser />
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* Command Search Modal */}
        <CommandSearch
          chats={chats}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </TooltipProvider>
    </>
  );
}
