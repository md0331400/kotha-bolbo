import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  gender: string;
  online: boolean;
  lastSeen: Timestamp | null;
  createdAt: Timestamp | null;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp | null;
  seen: boolean;
  repliedTo: MessageRef | null;
  edited: boolean;
  deleted: boolean;
}

export interface MessageRef {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantData: Record<string, {
    lastRead: Timestamp | null;
    unreadCount: number;
  }>;
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: Timestamp | null;
  } | null;
  updatedAt: Timestamp | null;
}

export type Tab = 'chats' | 'friends' | 'profile' | 'settings';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}
