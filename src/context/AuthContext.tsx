import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, isFirebaseConfigured } from '@/firebase/init';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateBio: (bio: string) => Promise<void>;
  updateGender: (gender: string) => Promise<void>;
  uploadPhoto: (file: File) => Promise<string>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Listen to user document in Firestore
        const unsubDoc = onSnapshot(
          doc(db, 'users', fbUser.uid),
          (snap) => {
            if (snap.exists()) {
              setUser({ ...snap.data(), uid: fbUser.uid } as User);
            } else {
              // Create user doc if it doesn't exist
              const userData: Omit<User, 'uid'> = {
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'User',
                photoURL: '',
                bio: 'Hey there! I am using Kotha Bolbo',
                gender: '',
                online: true,
                lastSeen: Timestamp.now(),
                createdAt: Timestamp.now(),
              };
              setDoc(doc(db, 'users', fbUser.uid), userData).catch(console.error);
              setUser({ ...userData, uid: fbUser.uid });
            }
            setLoading(false);
          },
          (err) => {
            console.error('User doc listener error:', err);
            setLoading(false);
          }
        );
        return () => unsubDoc();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Update online status
  useEffect(() => {
    if (!firebaseUser || !isFirebaseConfigured()) return;

    const userRef = doc(db, 'users', firebaseUser.uid);

    // Set online on mount
    updateDoc(userRef, { online: true, lastSeen: serverTimestamp() }).catch(console.error);

    // Set offline on unload
    const handleUnload = () => {
      // Use navigator.sendBeacon for reliable unload
      const blob = new Blob([JSON.stringify({ online: false, lastSeen: new Date().toISOString() })], { type: 'application/json' });
      // We can't use sendBeacon with Firestore directly, so we update before unload
      navigator.sendBeacon?.(
        `https://firestore.googleapis.com/v1/projects/${auth.app.options.projectId}/databases/(default)/documents/users/${firebaseUser.uid}?updateMask.fieldPaths=online&updateMask.fieldPaths=lastSeen`,
        blob
      );
    };

    // Also set offline periodically when inactive
    const heartbeat = setInterval(() => {
      updateDoc(userRef, { lastSeen: serverTimestamp() }).catch(console.error);
    }, 30000);

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      updateDoc(userRef, { online: false, lastSeen: serverTimestamp() }).catch(console.error);
    };
  }, [firebaseUser]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        displayName: name,
        photoURL: '',
        bio: 'Hey there! I am using Kotha Bolbo',
        gender: '',
        online: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use' ? 'Email already in use'
        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : err.code === 'auth/invalid-email' ? 'Invalid email address'
        : 'Signup failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found' ? 'Account not found'
        : err.code === 'auth/wrong-password' ? 'Incorrect password'
        : err.code === 'auth/invalid-email' ? 'Invalid email address'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
        : 'Login failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    if (firebaseUser) {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch(console.error);
    }
    await signOut(auth);
  }, [firebaseUser]);

  const forgotPassword = useCallback(async (email: string) => {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found' ? 'No account found with this email'
        : err.code === 'auth/invalid-email' ? 'Invalid email address'
        : 'Failed to send reset email. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    if (!firebaseUser) return;
    if (!name.trim()) throw new Error('Name cannot be empty');
    await updateProfile(firebaseUser, { displayName: name });
    await updateDoc(doc(db, 'users', firebaseUser.uid), { displayName: name.trim() });
  }, [firebaseUser]);

  const updateBio = useCallback(async (bio: string) => {
    if (!firebaseUser) return;
    await updateDoc(doc(db, 'users', firebaseUser.uid), { bio: bio.trim() });
  }, [firebaseUser]);

  const updateGender = useCallback(async (gender: string) => {
    if (!firebaseUser) return;
    await updateDoc(doc(db, 'users', firebaseUser.uid), { gender });
  }, [firebaseUser]);

  const uploadPhoto = useCallback(async (file: File): Promise<string> => {
    if (!firebaseUser) throw new Error('Not authenticated');
    if (file.size > 5 * 1024 * 1024) throw new Error('File too large (max 5MB)');
    const storageRef = ref(storage, `avatars/${firebaseUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateProfile(firebaseUser, { photoURL: url });
    await updateDoc(doc(db, 'users', firebaseUser.uid), { photoURL: url });
    return url;
  }, [firebaseUser]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!firebaseUser?.email) throw new Error('Not authenticated');
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    await updatePassword(firebaseUser, newPassword);
  }, [firebaseUser]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{
      user, firebaseUser, loading, error,
      signup, login, logout, forgotPassword,
      updateDisplayName, updateBio, updateGender,
      uploadPhoto, changePassword, clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};
