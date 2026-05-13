import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Avatar, SearchBar, EmptyState, OfflineBanner } from '@/components/ui';
import { formatTime } from '@/firebase/init';

interface ChatListScreenProps {
  onOpenChat: (convId: string) => void;
}

export const ChatListScreen = ({ onOpenChat }: ChatListScreenProps) => {
  const { user } = useAuth();
  const { conversations, conversationUsers, getTotalUnread } = useChat();
  const [search, setSearch] = useState('');

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(conv => {
      const otherUid = conv.participants.find(p => p !== user?.uid);
      const otherUser = otherUid ? conversationUsers[otherUid] : null;
      return otherUser?.displayName?.toLowerCase().includes(q) ||
             conv.lastMessage?.text?.toLowerCase().includes(q);
    });
  }, [conversations, search, user, conversationUsers]);

  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0e1a' }}>
      <OfflineBanner />

      {/* Header */}
      <div className="px-4 pt-4 pb-2 safe-top">
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Chats
          </h1>
          <div className="flex items-center gap-2">
            {getTotalUnread() > 0 && (
              <span className="text-xs text-accent font-medium">{getTotalUnread()} unread</span>
            )}
          </div>
        </div>

        {/* Search */}
        <SearchBar value={search} onChange={setSearch} placeholder="Search conversations..." />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            title={search ? 'No results found' : 'No conversations yet'}
            description={search ? 'Try a different search term' : 'Start chatting with friends from the Friends tab'}
          />
        ) : (
          <div className="px-2">
            {filteredConversations.map((conv) => {
              const otherUid = conv.participants.find(p => p !== user?.uid) || '';
              const otherUser = conversationUsers[otherUid];
              const unread = conv.participantData?.[user?.uid || '']?.unreadCount || 0;
              const isOwnLastMsg = conv.lastMessage?.senderId === user?.uid;

              return (
                <button
                  key={conv.id}
                  onClick={() => onOpenChat(conv.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 hover:bg-white/5 active:bg-white/10"
                >
                  {/* Avatar */}
                  <Avatar user={otherUser} size={52} showOnline />

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-gray-100 truncate text-[15px]">
                        {otherUser?.displayName || 'Unknown User'}
                      </span>
                      <span className={`text-xs flex-shrink-0 ml-2 ${unread > 0 ? 'text-accent font-semibold' : 'text-gray-500'}`}>
                        {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400 truncate">
                        {conv.lastMessage ? (
                          <>
                            {isOwnLastMsg && <span className="text-accent">You: </span>}
                            {conv.lastMessage.text}
                          </>
                        ) : (
                          <span className="text-gray-500 italic">Start a conversation</span>
                        )}
                      </p>
                      {unread > 0 && (
                        <span
                          className="flex-shrink-0 ml-2 min-w-[20px] h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center px-1.5"
                          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}
                        >
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
