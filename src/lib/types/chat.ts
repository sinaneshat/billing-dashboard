// Chat-related types for the LLM chat application interface

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export type Chat = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  isActive?: boolean;
};

export type ChatGroup = {
  label: string;
  chats: Chat[];
};

// Mock data for development
export const mockChats: Chat[] = [
  {
    id: '1',
    title: 'Building a Next.js App',
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'How do I build a Next.js app?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
    ],
    isActive: false,
  },
  {
    id: '2',
    title: 'React Hooks Guide',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    messages: [],
    isActive: false,
  },
  {
    id: '3',
    title: 'TypeScript Best Practices',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    messages: [],
    isActive: false,
  },
  {
    id: '4',
    title: 'Database Schema Design',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    messages: [],
    isActive: false,
  },
  {
    id: '5',
    title: 'API Integration Tips',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    messages: [],
    isActive: false,
  },
  {
    id: '6',
    title: 'CSS Layout Techniques',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    messages: [],
    isActive: false,
  },
  {
    id: '7',
    title: 'Authentication Strategies',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    messages: [],
    isActive: false,
  },
  {
    id: '8',
    title: 'Performance Optimization',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    messages: [],
    isActive: false,
  },
  {
    id: '9',
    title: 'Docker Deployment Guide',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25), // 25 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
    messages: [],
    isActive: false,
  },
];

// Helper function to group chats by time period
export function groupChatsByPeriod(chats: Chat[]): ChatGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: ChatGroup[] = [
    { label: 'Today', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Previous 7 Days', chats: [] },
    { label: 'Previous 30 Days', chats: [] },
    { label: 'Older', chats: [] },
  ];

  chats.forEach((chat) => {
    const chatDate = new Date(chat.updatedAt);

    if (chatDate >= today) {
      groups[0]?.chats.push(chat);
    } else if (chatDate >= yesterday) {
      groups[1]?.chats.push(chat);
    } else if (chatDate >= lastWeek) {
      groups[2]?.chats.push(chat);
    } else if (chatDate >= lastMonth) {
      groups[3]?.chats.push(chat);
    } else {
      groups[4]?.chats.push(chat);
    }
  });

  // Filter out empty groups
  return groups.filter(group => group.chats.length > 0);
}
