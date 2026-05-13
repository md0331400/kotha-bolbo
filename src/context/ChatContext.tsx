import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db, getConversationId, isFirebaseConfigured } from '@/firebase/init';
import { useAuth } from './AuthContext';
import { Conversation, Message, MessageRef, User } from '@/types';

interface ChatContextType {
  conversations: Conversation[];
  conversationUsers: Record<string, User>;
  messages: Message[];
  activeConvId: string | null;
  typingUsers: Record<string, string[]>;
  loading: boolean;
  openConversation: (userId: string) => Promise<void>;
  setActiveConvId: (id: string | null) => void;
  sendMessage: (text: string, repliedTo?: MessageRef | null) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsSeen: () => void;
  setTyping: (isTyping: boolean) => void;
  searchUsers: (query: string) => Promise<User[]>;
  getTotalUnread: () => number;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = (): ChatContextType => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationUsers, setConversationUsers] = useState<Record<string, User>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef(false);

  // Listen to conversations
  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);

      // Load user info for each conversation
      convs.forEach(conv => {
        const otherUid = conv.participants.find(p => p !== user.uid);
        if (otherUid && !conversationUsers[otherUid]) {
          getDoc(doc(db, 'users', otherUid)).then(snap => {
            if (snap.exists()) {
              setConversationUsers(prev => ({ ...prev, [otherUid]: { ...snap.data(), uid: otherUid } as User }));
            }
          }).catch(console.error);
        }
      });
    }, (err) => {
      console.error('Conversations listener error:', err);
    });

    return () => unsub();
  }, [user]);

  // Listen to messages for active conversation
  useEffect(() => {
    if (!activeConvId || !isFirebaseConfigured()) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', activeConvId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
    }, (err) => {
      console.error('Messages listener error:', err);
    });

    return () => unsub();
  }, [activeConvId]);

  // Listen to typing indicators for active conversation
  useEffect(() => {
    if (!activeConvId || !isFirebaseConfigured()) return;

    const unsub = onSnapshot(
      doc(db, 'typing', activeConvId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const typers: string[] = [];
          for (const [uid, isTyping] of Object.entries(data)) {
            if (isTyping && uid !== user?.uid) {
              typers.push(uid);
            }
          }
          setTypingUsers(prev => ({ ...prev, [activeConvId]: typers }));
        } else {
          setTypingUsers(prev => ({ ...prev, [activeConvId]: [] }));
        }
      },
      () => {}
    );

    return () => unsub();
  }, [activeConvId, user?.uid]);

  // Open or create a conversation with another user
  const openConversation = useCallback(async (otherUserId: string) => {
    if (!user || !isFirebaseConfigured()) return;
    setLoading(true);
    try {
      const convId = getConversationId(user.uid, otherUserId);
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);

      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [user.uid, otherUserId],
          participantData: {
            [user.uid]: { lastRead: serverTimestamp(), unreadCount: 0 },
            [otherUserId]: { lastRead: serverTimestamp(), unreadCount: 0 },
          },
          updatedAt: serverTimestamp(),
        });
      }

      // Load other user info
      if (!conversationUsers[otherUserId]) {
        const userSnap = await getDoc(doc(db, 'users', otherUserId));
        if (userSnap.exists()) {
          setConversationUsers(prev => ({
            ...prev,
            [otherUserId]: { ...userSnap.data(), uid: otherUserId } as User
          }));
        }
      }

      setActiveConvId(convId);
    } catch (err) {
      console.error('Failed to open conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [user, conversationUsers]);

  // Send a message
  const sendMessage = useCallback(async (text: string, repliedTo?: MessageRef | null) => {
    if (!user || !activeConvId || !isFirebaseConfigured()) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const msgRef = doc(collection(db, 'conversations', activeConvId, 'messages'));
      const msgData = {
        senderId: user.uid,
        text: trimmed,
        timestamp: serverTimestamp(),
        seen: false,
        repliedTo: repliedTo || null,
        edited: false,
        deleted: false,
      };

      const batch = writeBatch(db);
      batch.set(msgRef, msgData);

      // Update conversation
      const convRef = doc(db, 'conversations', activeConvId);
      const convSnap = await getDoc(convRef);
      const convData = convSnap.data();
      const otherUid = convData?.participants?.find((p: string) => p !== user.uid);

      batch.update(convRef, {
        lastMessage: {
          text: trimmed.substring(0, 100),
          senderId: user.uid,
          timestamp: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
        [`participantData.${otherUid}.unreadCount`]: (convData?.participantData?.[otherUid]?.unreadCount || 0) + 1,
      });

      await batch.commit();

      // Clear typing
      setTyping(false);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [user, activeConvId]);

  // Edit a message
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!user || !activeConvId || !isFirebaseConfigured()) return;
    const trimmed = newText.trim();
    if (!trimmed) return;

    try {
      const msgRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists() || msgSnap.data().senderId !== user.uid) return;

      await updateDoc(msgRef, {
        text: trimmed,
        edited: true,
      });

      // Update last message if this was the last one
      const convRef = doc(db, 'conversations', activeConvId);
      await updateDoc(convRef, {
        'lastMessage.text': trimmed.substring(0, 100),
      });
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  }, [user, activeConvId]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user || !activeConvId || !isFirebaseConfigured()) return;

    try {
      const msgRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists() || msgSnap.data().senderId !== user.uid) return;

      await updateDoc(msgRef, {
        deleted: true,
        text: '',
        edited: true,
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }, [user, activeConvId]);

  // Mark messages as seen
  const markAsSeen = useCallback(() => {
    if (!user || !activeConvId || !isFirebaseConfigured()) return;

    const unseenMsgs = messages.filter(m => m.senderId !== user.uid && !m.seen);
    if (unseenMsgs.length === 0) return;

    const batch = writeBatch(db);
    unseenMsgs.forEach(msg => {
      batch.update(doc(db, 'conversations', activeConvId, 'messages', msg.id), { seen: true });
    });

    // Reset unread count
    batch.update(doc(db, 'conversations', activeConvId), {
      [`participantData.${user.uid}.unreadCount`]: 0,
      [`participantData.${user.uid}.lastRead`]: serverTimestamp(),
    });

    batch.commit().catch(console.error);
  }, [user, activeConvId, messages]);

  // Mark as seen when messages change
  useEffect(() => {
    if (activeConvId && user) {
      markAsSeen();
    }
  }, [messages.length, activeConvId]);

  // Set typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (!user || !activeConvId || !isFirebaseConfigured()) return;

    if (isTyping === lastTypingRef.current) return;
    lastTypingRef.current = isTyping;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const typingRef = doc(db, 'typing', activeConvId);
    setDoc(typingRef, { [user.uid]: isTyping }, { merge: true }).catch(console.error);

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        lastTypingRef.current = false;
        setDoc(typingRef, { [user.uid]: false }, { merge: true }).catch(console.error);
      }, 3000);
    }
  }, [user, activeConvId]);

  // Search users
  const searchUsers = useCallback(async (searchQuery: string): Promise<User[]> => {
    if (!isFirebaseConfigured() || !searchQuery.trim()) return [];
    try {
      // Firestore doesn't support full-text search, so we use prefix matching
      const q = query(
        collection(db, 'users'),
        where('displayName', '>=', searchQuery.trim()),
        where('displayName', '<=', searchQuery.trim() + '\uf8ff'),
        limit(20)
      );
      const result = await getDocs(q);
      return result.docs
        .map(d => ({ ...d.data(), uid: d.id } as User))
        .filter(u => u.uid !== user?.uid);
    } catch (err) {
      console.error('Search users error:', err);
      return [];
    }
  }, [user]);

  // Get total unread count
  const getTotalUnread = useCallback((): number => {
    if (!user) return 0;
    return conversations.reduce((total, conv) => {
      return total + (conv.participantData?.[user.uid]?.unreadCount || 0);
    }, 0);
  }, [conversations, user]);

  return (
    <ChatContext.Provider value={{
      conversations,
      conversationUsers,
      messages,
      activeConvId,
      typingUsers,
      loading,
      openConversation,
      setActiveConvId,
      sendMessage,
      editMessage,
      deleteMessage,
      markAsSeen,
      setTyping,
      searchUsers,
      getTotalUnread,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
