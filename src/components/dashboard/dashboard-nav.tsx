'use client';

import { Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ChatList } from '@/components/dashboard/chat-list';
import { NavUser } from '@/components/dashboard/nav-user';
import RHFSearchField from '@/components/forms/rhf-search-field';
import { Form } from '@/components/ui/form';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { BRAND } from '@/constants/brand';
import type { Chat } from '@/lib/types/chat';
import { groupChatsByPeriod, mockChats } from '@/lib/types/chat';

type SearchFormData = {
  search: string;
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const t = useTranslations();
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize RHF for search
  const searchForm = useForm<SearchFormData>({
    defaultValues: {
      search: '',
    },
  });

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-10 items-center justify-center rounded-lg">
                  <Image
                    src="/static/logo.png"
                    alt={t('brand.logoAlt')}
                    width={40}
                    height={40}
                    className="size-10 object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">{BRAND.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{BRAND.tagline}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Search Field */}
        <Form {...searchForm}>
          <SidebarGroup className="py-0 group-data-[collapsible=icon]:hidden">
            <SidebarGroupContent>
              <RHFSearchField
                name="search"
                title={t('chat.searchChats')}
                placeholder={t('chat.searchChats')}
                onDebouncedChange={handleSearchChange}
                debounceMs={300}
                className="w-full"
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </Form>
      </SidebarHeader>

      <SidebarContent>
        {/* New Chat Button */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleNewChat}
                tooltip={t('navigation.newChat')}
                variant="outline"
              >
                <Plus />
                <span>{t('navigation.newChat')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <ChatList
          chatGroups={chatGroups}
          favorites={favorites}
          onDeleteChat={handleDeleteChat}
          onToggleFavorite={handleToggleFavorite}
          searchTerm={searchTerm}
        />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
