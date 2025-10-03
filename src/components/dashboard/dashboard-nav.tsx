'use client';

import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChatList } from '@/components/dashboard/chat-list';
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
  const [chats] = useState<Chat[]>(mockChats);

  const handleNewChat = () => {
    router.push('/dashboard');
  };

  const handleDeleteChat = (chatId: string) => {
    // TODO: Implement delete chat functionality
    console.log('Delete chat:', chatId);
  };

  const chatGroups = groupChatsByPeriod(chats);

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
                  <motion.div
                    className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Image
                      src="/static/logo.png"
                      alt={t('brand.logoAlt')}
                      width={20}
                      height={20}
                      className="size-5 object-contain"
                    />
                  </motion.div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{BRAND.name}</span>
                    <span className="text-xs">{BRAND.tagline}</span>
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
            className="w-full justify-center group-data-[collapsible=icon]:justify-center"
            size="sm"
            asChild
          >
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Plus className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">{t('navigation.newChat')}</span>
            </motion.button>
          </Button>
        </motion.div>
      </SidebarHeader>

      <SidebarContent>
        <ChatList chatGroups={chatGroups} onDeleteChat={handleDeleteChat} />
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
