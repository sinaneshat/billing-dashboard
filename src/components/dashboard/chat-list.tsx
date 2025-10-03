'use client';

import { MoreHorizontal, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type { ChatGroup } from '@/lib/types/chat';

type ChatListProps = {
  chatGroups: ChatGroup[];
  onDeleteChat: (chatId: string) => void;
};

export function ChatList({ chatGroups, onDeleteChat }: ChatListProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations('chat');

  return (
    <>
      {chatGroups.map((group, groupIndex) => (
        <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:hidden">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: groupIndex * 0.05 }}
          >
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          </motion.div>
          <SidebarMenu>
            {group.chats.map((chat, chatIndex) => {
              const isActive = pathname === `/dashboard/chat/${chat.id}`;
              return (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: groupIndex * 0.05 + chatIndex * 0.03,
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
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
