'use client';

import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';

type ChatSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ChatSearch({ value, onChange }: ChatSearchProps) {
  const t = useTranslations();

  return (
    <motion.div
      className="px-2 py-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="relative group-data-[collapsible=icon]:hidden">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('chat.searchChats')}
          className="h-9 w-full bg-background pl-8"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </motion.div>
  );
}
