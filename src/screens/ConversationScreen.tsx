import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Avatar, TypingIndicator, DateSeparator, Modal, showToast } from '@/components/ui';
import { formatMessageTime, formatDateSeparator } from '@/firebase/init';
import { Message, MessageRef } from '@/types';

interface ConversationScreenProps {
  convId: string;
  onBack: () => void;
}

export const ConversationScreen = ({ convId, onBack }: ConversationScreenProps) => {
  const { user } = useAuth();
  const { messages, conversationUsers, typingUsers, sendMessage, editMessage, deleteMessage, setTyping, setActiveConvId } = useChat();
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherUid = useMemo(() => {
    // Get from convId - it's sorted alphabetically
    const parts = convId.split('_');
    return parts.find(p => p !== user?.uid) || parts[0];
  }, [convId, user]);

  const otherUser = conversationUsers[otherUid];
  const isTyping = (typingUsers[convId] || []).length > 0;

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Set active conversation
  useEffect(() => {
    setActiveConvId(convId);
    return () => setActiveConvId(null);
  }, [convId]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
      const dateStr = msg.timestamp ? formatDateSeparator(msg.timestamp) : 'Unknown';
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    if (editingMsg) {
      editMessage(editingMsg.id, text);
      setEditingMsg(null);
      showToast('Message edited', 'success');
    } else {
      const replyRef: MessageRef | null = replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderId: replyingTo.senderId,
        senderName: replyingTo.senderId === user?.uid ? 'You' : (otherUser?.displayName || 'User'),
      } : null;
      sendMessage(text, replyRef);
    }

    setInputText('');
    setReplyingTo(null);
    inputRef.current?.focus();
  }, [inputText, editingMsg, replyingTo, user, otherUser, sendMessage, editMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setTyping(e.target.value.length > 0);
  }, [setTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleTouchStart = useCallback((msg: Message) => {
    longPressTimer.current = setTimeout(() => {
      setActionMsg(msg);
      setShowActions(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!actionMsg) return;
    setShowActions(false);
    await deleteMessage(actionMsg.id);
    showToast('Message deleted', 'info');
    setActionMsg(null);
  }, [actionMsg, deleteMessage]);

  const handleEdit = useCallback(() => {
    if (!actionMsg) return;
    setShowActions(false);
    setEditingMsg(actionMsg);
    setInputText(actionMsg.text);
    setActionMsg(null);
    inputRef.current?.focus();
  }, [actionMsg]);

  const handleReply = useCallback(() => {
    if (!actionMsg) return;
    setShowActions(false);
    setReplyingTo(actionMsg);
    setActionMsg(null);
    inputRef.current?.focus();
  }, [actionMsg]);

  const handleCopy = useCallback(() => {
    if (!actionMsg) return;
    navigator.clipboard?.writeText(actionMsg.text);
    showToast('Copied to clipboard', 'success');
    setShowActions(false);
    setActionMsg(null);
  }, [actionMsg]);

  const cancelEdit = useCallback(() => {
    setEditingMsg(null);
    setInputText('');
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex flex-col animate-slideInRight" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div className="glass-strong safe-top flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-gray-300">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <Avatar user={otherUser} size={40} showOnline />

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-100 truncate text-[15px]">{otherUser?.displayName || 'User'}</h2>
            <p className="text-xs" style={{ color: otherUser?.online ? '#10b981' : 'rgba(255,255,255,0.35)' }}>
              {isTyping ? (
                <span className="text-accent italic">typing...</span>
              ) : otherUser?.online ? (
                'Online'
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ background: '#0a0e1a' }}>
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <DateSeparator label={group.date} />
            {group.messages.map((msg) => {
              const isOwn = msg.senderId === user?.uid;
              const isDeleted = msg.deleted;

              return (
                <div
                  key={msg.id}
                  className={`flex mb-1 animate-fadeIn ${isOwn ? 'justify-end' : 'justify-start'}`}
                  onTouchStart={() => !isDeleted && handleTouchStart(msg)}
                  onTouchEnd={handleTouchEnd}
                  onContextMenu={(e) => {
                    if (!isDeleted) {
                      e.preventDefault();
                      setActionMsg(msg);
                      setShowActions(true);
                    }
                  }}
                >
                  <div className={`max-w-[78%] px-3.5 py-2.5 ${isOwn ? 'msg-sent' : 'msg-received'}`}>
                    {/* Reply preview */}
                    {msg.repliedTo && !isDeleted && (
                      <div className="mb-2 pl-2 text-xs rounded-lg" style={{ borderLeft: '2px solid #00d4ff', background: 'rgba(0,212,255,0.05)' }}>
                        <p className="text-accent font-medium">{msg.repliedTo.senderName}</p>
                        <p className="text-gray-400 truncate">{msg.repliedTo.text}</p>
                      </div>
                    )}

                    {/* Message text */}
                    <p className={`text-[14.5px] leading-relaxed ${isDeleted ? 'text-gray-500 italic' : 'text-gray-100'}`}>
                      {isDeleted ? '🚫 This message was deleted' : msg.text}
                    </p>

                    {/* Timestamp & status */}
                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-500">{formatMessageTime(msg.timestamp)}</span>
                      {msg.edited && !isDeleted && <span className="text-[10px] text-gray-500">(edited)</span>}
                      {isOwn && !isDeleted && (
                        <span style={{ color: msg.seen ? '#00d4ff' : 'rgba(255,255,255,0.3)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                            {msg.seen && <polyline points="20 6 9 17 4 12" transform="translate(4, 0)" />}
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply bar */}
      {replyingTo && (
        <div className="flex-shrink-0 px-3 pt-2 animate-slideUp">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-1 h-full rounded-full min-h-[30px]" style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-accent font-medium">
                Replying to {replyingTo.senderId === user?.uid ? 'yourself' : (otherUser?.displayName || 'User')}
              </p>
              <p className="text-xs text-gray-400 truncate">{replyingTo.text}</p>
            </div>
            <button onClick={cancelReply} className="text-gray-500 hover:text-gray-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Editing bar */}
      {editingMsg && (
        <div className="flex-shrink-0 px-3 pt-2 animate-slideUp">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-1 h-full rounded-full min-h-[30px]" style={{ background: '#f59e0b' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-warning font-medium">Editing message</p>
              <p className="text-xs text-gray-400 truncate">{editingMsg.text}</p>
            </div>
            <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="glass-strong flex-shrink-0 safe-bottom">
        <div className="flex items-end gap-2 px-3 py-3">
          <div className="flex-1 rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMsg ? 'Edit message...' : 'Type a message...'}
              className="w-full text-[15px]"
              autoComplete="off"
            />
          </div>

          <button
            onClick={handleSend}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              background: inputText.trim() ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.06)',
              boxShadow: inputText.trim() ? '0 4px 15px rgba(0, 212, 255, 0.3)' : 'none',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={inputText.trim() ? 'white' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Message actions Modal */}
      <Modal open={showActions} onClose={() => { setShowActions(false); setActionMsg(null); }}>
        {actionMsg && (
          <div className="space-y-1">
            {/* Reply */}
            <button onClick={handleReply} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              <span className="text-gray-200 text-sm">Reply</span>
            </button>

            {/* Copy */}
            {!actionMsg.deleted && (
              <button onClick={handleCopy} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span className="text-gray-200 text-sm">Copy</span>
              </button>
            )}

            {/* Edit (own messages only) */}
            {actionMsg.senderId === user?.uid && !actionMsg.deleted && (
              <button onClick={handleEdit} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="text-gray-200 text-sm">Edit</span>
              </button>
            )}

            {/* Delete (own messages only) */}
            {actionMsg.senderId === user?.uid && !actionMsg.deleted && (
              <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span className="text-danger text-sm">Delete</span>
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
