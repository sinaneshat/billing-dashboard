'use client';

import { MoreHorizontal, Star, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Chat, ChatGroup } from '@/lib/types/chat';

type ChatListProps = {
  chatGroups: ChatGroup[];
  favorites: Chat[];
  onDeleteChat: (chatId: string) => void;
  onToggleFavorite: (chatId: string) => void;
  searchTerm: string;
};

export function ChatList({ chatGroups, favorites = [], onDeleteChat, onToggleFavorite, searchTerm = '' }: ChatListProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations('chat');

  const renderChatItem = (chat: Chat, index: number, groupDelay = 0) => {
    const isActive = pathname === `/dashboard/chat/${chat.id}`;
    return (
      <motion.div
        key={chat.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.2,
          delay: groupDelay + index * 0.03,
        }}
      >
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive} tooltip={chat.title}>
            <Link href={`/dashboard/chat/${chat.id}`}>
              <span>{chat.title}</span>
            </Link>
          </SidebarMenuButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuAction showOnHover>
                <MoreHorizontal />
                <span className="sr-only">More</span>
              </SidebarMenuAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align={isMobile ? 'end' : 'start'}
            >
              <DropdownMenuItem onClick={() => onToggleFavorite(chat.id)}>
                <Star className={chat.isFavorite ? 'fill-current' : ''} />
                <span>{chat.isFavorite ? t('removeFromFavorites') : t('addToFavorites')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteChat(chat.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 />
                <span>{t('deleteChat')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </motion.div>
    );
  };

  // Show empty state when no results from search
  if (searchTerm && chatGroups.length === 0 && favorites.length === 0) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('noResults')}</p>
          <p className="text-xs text-muted-foreground">{t('noResultsDescription')}</p>
        </div>
      </SidebarGroup>
    );
  }

  return (
    <>
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <SidebarGroupLabel>{t('favorites')}</SidebarGroupLabel>
          </motion.div>
          <SidebarMenu>
            {favorites.map((chat, index) => renderChatItem(chat, index, 0))}
          </SidebarMenu>
        </SidebarGroup>
      )}

      {/* Regular Chat Groups */}
      {chatGroups.map((group, groupIndex) => (
        <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:hidden">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: (groupIndex + (favorites.length > 0 ? 1 : 0)) * 0.05 }}
          >
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          </motion.div>
          <SidebarMenu>
            {group.chats.map((chat, chatIndex) =>
              renderChatItem(chat, chatIndex, (groupIndex + (favorites.length > 0 ? 1 : 0)) * 0.05),
            )}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
