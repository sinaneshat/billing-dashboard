'use client';

import { MessageSquare, MoreHorizontal, Star } from 'lucide-react';
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

  const renderChatItem = (chat: Chat, showIcon: boolean = false) => {
    const isActive = pathname === `/dashboard/chat/${chat.id}`;
    return (
      <SidebarMenuItem key={chat.id}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={chat.title}
          className="group-has-[[data-state=open]]/menu-item:bg-sidebar-accent"
        >
          <Link href={`/dashboard/chat/${chat.id}`}>
            {showIcon && <MessageSquare className="size-4" />}
            <span className="truncate">{chat.title}</span>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'right'}
            align={isMobile ? 'end' : 'start'}
          >
            <DropdownMenuItem onClick={() => onToggleFavorite(chat.id)}>
              <span>{chat.isFavorite ? t('removeFromFavorites') : t('addToFavorites')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteChat(chat.id)}
              className="text-destructive focus:text-destructive"
            >
              <span>{t('deleteChat')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
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
          <SidebarGroupLabel className="flex items-center gap-2">
            <Star className="size-4 fill-yellow-500 text-yellow-500" />
            {t('favorites')}
          </SidebarGroupLabel>
          <SidebarMenu>
            {favorites.map(chat => renderChatItem(chat, true))}
          </SidebarMenu>
        </SidebarGroup>
      )}

      {/* Regular Chat Groups */}
      {chatGroups.map(group => (
        <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.chats.map(chat => renderChatItem(chat, true))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
