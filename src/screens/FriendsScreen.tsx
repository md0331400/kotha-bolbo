import { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, orderBy, startAt, endAt } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase/init';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Avatar, SearchBar, EmptyState, Spinner, showToast } from '@/components/ui';
import { User } from '@/types';

export const FriendsScreen = () => {
  const { user } = useAuth();
  const { openConversation, conversations } = useChat();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);

  // Load all users initially
  useEffect(() => {
    if (!isFirebaseConfigured()) { setLoadingAll(false); return; }
    getDocs(query(collection(db, 'users'), limit(50))).then(snap => {
      const users = snap.docs.map(d => ({ ...d.data(), uid: d.id } as User)).filter(u => u.uid !== user?.uid);
      setAllUsers(users);
      setLoadingAll(false);
    }).catch(() => setLoadingAll(false));
  }, [user]);

  // Search users
  useEffect(() => {
    if (!search.trim() || !isFirebaseConfigured()) {
      setResults([]);
      return;
    }

    setSearching(true);
    const q = query(
      collection(db, 'users'),
      orderBy('displayName'),
      startAt(search.trim()),
      endAt(search.trim() + '\uf8ff'),
      limit(20)
    );

    getDocs(q).then(snap => {
      const users = snap.docs.map(d => ({ ...d.data(), uid: d.id } as User)).filter(u => u.uid !== user?.uid);
      setResults(users);
      setSearching(false);
    }).catch(() => setSearching(false));
  }, [search, user]);

  const displayUsers = search.trim() ? results : allUsers;

  const handleStartChat = async (otherUser: User) => {
    try {
      await openConversation(otherUser.uid);
    } catch {
      showToast('Failed to start conversation', 'error');
    }
  };

  const hasConversation = (uid: string) => {
    return conversations.some(c => c.participants.includes(uid));
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 safe-top">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Friends
        </h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Search people..." />
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {loadingAll || searching ? (
          <div className="flex items-center justify-center h-40">
            <Spinner />
          </div>
        ) : displayUsers.length === 0 ? (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title={search ? 'No users found' : 'No users yet'}
            description={search ? 'Try a different search' : 'Invite friends to join Kotha Bolbo'}
          />
        ) : (
          <div className="px-2">
            {displayUsers.map((u) => (
              <div
                key={u.uid}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 hover:bg-white/5"
              >
                <Avatar user={u} size={48} showOnline />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 truncate text-[15px]">{u.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{u.bio || 'Hey there! I am using Kotha Bolbo'}</p>
                </div>

                <button
                  onClick={() => handleStartChat(u)}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: hasConversation(u.uid) ? 'rgba(0, 212, 255, 0.1)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hasConversation(u.uid) ? '#00d4ff' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
