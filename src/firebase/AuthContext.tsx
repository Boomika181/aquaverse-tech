import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  User,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from './config';
import { createUserProfile, getUserProfile, updateUserProfile, updateUserLastLogin } from './utils';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signUp: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (oobCode: string, newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log('[AUTH SUCCESS] UID:', currentUser.uid, 'Email:', currentUser.email);
        try {
          const email = (currentUser.email || '').trim().toLowerCase();
          const isAdminEmail = email === 'boomikaram35@gmail.com';
          const targetRole: UserRole = isAdminEmail ? 'admin' : 'citizen';

          // Fetch existing user profile from Firestore
          let profile = await getUserProfile(currentUser.uid);
          
          if (!profile) {
            console.log('[PROFILE INIT] No profile found for UID:', currentUser.uid, '- Creating initial document.');
            profile = await createUserProfile(
              currentUser.uid,
              email,
              currentUser.displayName || email.split('@')[0],
              targetRole
            );
          } else {
            console.log('[PROFILE RESOLVED] UID:', currentUser.uid, 'Role:', profile.role);
            // Ensure admin account retains admin role
            if (isAdminEmail && profile.role !== 'admin') {
              await updateUserProfile(currentUser.uid, { role: 'admin' });
              profile.role = 'admin';
            }
            await updateUserLastLogin(currentUser.uid);
            profile.lastLogin = new Date();
          }
          setUserProfile(profile);
        } catch (error: any) {
          console.error('[PROFILE READ ERROR]', 'Code:', error?.code || 'UNKNOWN', 'Message:', error?.message || String(error));
          const email = (currentUser.email || '').trim().toLowerCase();
          const isAdminEmail = email === 'boomikaram35@gmail.com';
          const fallbackRole: UserRole = isAdminEmail ? 'admin' : 'citizen';

          setUserProfile({
            uid: currentUser.uid,
            email,
            displayName: currentUser.displayName || email.split('@')[0] || 'User',
            name: currentUser.displayName || email.split('@')[0] || 'User',
            role: fallbackRole,
            createdAt: new Date(),
          });
        }
      } else {
        console.log('[AUTH LOGOUT] Session ended.');
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    const cleanedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, cleanedEmail, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, displayName: string, password: string) => {
    const cleanedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
      const currentUser = userCredential.user;
      
      const isAdminEmail = cleanedEmail === 'boomikaram35@gmail.com';
      const role: UserRole = isAdminEmail ? 'admin' : 'citizen';
      
      const profile = await createUserProfile(currentUser.uid, cleanedEmail, displayName, role);
      setUserProfile(profile);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    const cleanedEmail = email.trim().toLowerCase();
    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    };
    await sendPasswordResetEmail(auth, cleanedEmail, actionCodeSettings);
  };

  const confirmResetPassword = async (oobCode: string, newPassword: string) => {
    await firebaseConfirmPasswordReset(auth, oobCode, newPassword);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user is signed in');
    await updateUserProfile(user.uid, data);
    setUserProfile((prev) => prev ? { ...prev, ...data } : null);
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
    confirmResetPassword,
    updateProfile,
    isAdmin: userProfile?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
