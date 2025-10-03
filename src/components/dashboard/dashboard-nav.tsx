'use client';

import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ChatList } from '@/components/dashboard/chat-list';
import { ChatSearch } from '@/components/dashboard/chat-search';
import { NavUser } from '@/components/dashboard/nav-user';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { BRAND } from '@/constants/brand';
import type { Chat } from '@/lib/types/chat';
import { groupChatsByPeriod, mockChats } from '@/lib/types/chat';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const t = useTranslations();
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [searchTerm, setSearchTerm] = useState('');

  const handleNewChat = () => {
    router.push('/dashboard');
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

  // Filter chats based on search term
  const filteredChats = useMemo(() => {
    if (!searchTerm)
      return chats;
    return chats.filter(chat =>
      chat.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [chats, searchTerm]);

  // Get favorites from filtered chats
  const favorites = useMemo(() =>
    filteredChats.filter(chat => chat.isFavorite), [filteredChats]);

  // Get non-favorite chats for grouping
  const nonFavoriteChats = useMemo(() =>
    filteredChats.filter(chat => !chat.isFavorite), [filteredChats]);

  const chatGroups = groupChatsByPeriod(nonFavoriteChats);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Image
                      src="/static/logo.png"
                      alt={t('brand.logoAlt')}
                      width={32}
                      height={32}
                      className="size-8 object-contain"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{BRAND.name}</span>
                    <span className="truncate text-xs">{BRAND.tagline}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </motion.div>

        {/* New Chat Button */}
        <motion.div
          className="px-2 py-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button
            onClick={handleNewChat}
            className="w-full justify-center group-data-[collapsible=icon]:justify-center gap-2"
            size="sm"
          >
            <Plus />
            <span className="group-data-[collapsible=icon]:hidden">{t('navigation.newChat')}</span>
          </Button>
        </motion.div>

        {/* Search Bar */}
        <ChatSearch value={searchTerm} onChange={setSearchTerm} />
      </SidebarHeader>

      <SidebarContent>
        <ChatList
          chatGroups={chatGroups}
          favorites={favorites}
          onDeleteChat={handleDeleteChat}
          onToggleFavorite={handleToggleFavorite}
          searchTerm={searchTerm}
        />
      </SidebarContent>

      <SidebarFooter>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <NavUser />
        </motion.div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
