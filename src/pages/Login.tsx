import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';
import { getUserProfile } from '../firebase/utils';
import { auth } from '../firebase/config';
import { motion } from 'motion/react';
import waterBg from '../water-bg.jpg';
import linesVideo from '../lines-video.mp4';
import { 
  Droplet, 
  Mail, 
  Lock, 
  User, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

export default function Login() {
  const { signIn, signUp, resetPassword, confirmResetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'signin' | 'signup' | 'forgot' | 'confirmReset'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'confirmReset'>('signin');

  // Input States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check URL query parameters for oobCode password reset action link
  const searchParams = new URLSearchParams(location.search);
  const oobCode = searchParams.get('oobCode');
  const actionMode = searchParams.get('mode');

  React.useEffect(() => {
    if (oobCode && (actionMode === 'resetPassword' || !actionMode)) {
      setMode('confirmReset');
    }
  }, [oobCode, actionMode]);

  // Handle Sign In, Sign Up, Reset Password, Confirm Reset
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanedEmail = email.trim().toLowerCase();

    try {
      if (mode === 'signin') {
        await signIn(cleanedEmail, password, rememberMe);
        const currentUser = auth.currentUser;
        const isAdminEmail = (currentUser?.email || cleanedEmail).toLowerCase() === 'boomikaram35@gmail.com';
        
        if (isAdminEmail) {
          navigate('/admin');
        } else {
          navigate('/predict');
        }
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await signUp(cleanedEmail, displayName, password);
        const isAdminEmail = cleanedEmail === 'boomikaram35@gmail.com';
        
        if (isAdminEmail) {
          navigate('/admin');
        } else {
          navigate('/predict');
        }
      } else if (mode === 'forgot') {
        if (!cleanedEmail) {
          throw new Error('Please enter your registered email address.');
        }
        // Wait for Firebase sendPasswordResetEmail Promise to resolve cleanly
        await resetPassword(cleanedEmail);
        setSuccessMsg('Password reset instructions have been dispatched. Please check your inbox and spam/junk folder.');
      } else if (mode === 'confirmReset') {
        if (!oobCode) {
          throw new Error('Invalid or missing password reset code.');
        }
        if (newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        await confirmResetPassword(oobCode, newPassword);
        setSuccessMsg('Password successfully reset! You can now log in with your new password.');
        setMode('signin');
        setNewPassword('');
        setPassword('');
      }
    } catch (err: any) {
      console.error('Firebase Auth Error Code:', err?.code, err?.message);
      let errMsg = 'An unexpected error occurred during authentication. Please try again.';

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        errMsg = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/user-not-found') {
        if (mode === 'forgot') {
          errMsg = 'No account found with this email address. Please check your email or register a new account.';
        } else {
          errMsg = 'Incorrect email or password. Please try again.';
        }
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email structure. Please check your email address.';
      } else if (err.code === 'auth/user-disabled') {
        errMsg = 'This account has been disabled. Please contact support.';
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = 'Too many requests. Please wait a few minutes and try again.';
      } else if (err.code === 'auth/network-request-failed') {
        errMsg = 'Network request failed. Please check your internet connection.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'An account with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password must be at least 6 characters long.';
      } else if (err.code === 'auth/expired-action-code') {
        errMsg = 'The password reset link has expired. Please request a new password reset email.';
      } else if (err.code === 'auth/invalid-action-code') {
        errMsg = 'The password reset link is invalid or has already been used.';
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        errMsg = 'Password reset functionality is disabled in Firebase Console configuration.';
      } else if (err.message && typeof err.message === 'string' && !err.message.includes('{')) {
        errMsg = err.message;
      }

      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#000000] text-[#EAF6FF] min-h-screen py-16 px-4 flex items-center justify-center selection:bg-[#168CFF]/30 selection:text-[#42D9FF] relative overflow-hidden">
      
      {/* EXACT UPLOADED WATER BACKGROUND IMAGE & LIVE MP4 VIDEO LOOP LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={waterBg} 
          alt="Water Auth Portal Environment" 
          className="w-full h-full object-cover object-center opacity-70 animate-slow-bg"
        />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          controls={false}
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen pointer-events-none"
          src={linesVideo}
        />
        <div className="absolute inset-0 bg-[#000000]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#42D9FF]/15 to-transparent w-[50%] h-full animate-water-light pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-floating-panel rounded-2xl p-6 md:p-8 relative z-10 space-y-6 shadow-2xl"
      >
        
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="bg-[#168CFF]/15 p-2.5 rounded-2xl border border-[#168CFF]/30 w-fit mx-auto">
            <img 
              src="/logo-mark.png" 
              alt="AquaVerse AI Logo" 
              className="h-9 w-9 object-contain filter drop-shadow-[0_0_10px_rgba(22,140,255,0.5)]" 
            />
          </div>
          <h2 className="font-sans font-extrabold text-2xl text-white tracking-tight">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Register Citizen Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'confirmReset' && 'Set New Password'}
          </h2>
          <p className="text-xs text-[#526A7E] max-w-xs mx-auto">
            {mode === 'signin' && 'Sign in to access saved chemical logs and environmental reports.'}
            {mode === 'signup' && 'Create your permanent water guardian credentials.'}
            {mode === 'forgot' && 'Enter your email address to receive password reset instructions.'}
            {mode === 'confirmReset' && 'Enter your new account password below.'}
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] p-3 rounded-xl text-xs font-semibold flex items-start space-x-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] p-3 rounded-xl text-xs font-semibold flex items-start space-x-2">
            <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs text-[#526A7E] font-semibold block">Full Display Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#526A7E]">
                  <User className="h-4 w-4" />
                </div>
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#030A12] text-white border border-[#08243A] focus:border-[#168CFF] rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode !== 'confirmReset' && (
            <div className="space-y-1">
              <label className="text-xs text-[#526A7E] font-semibold block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#526A7E]">
                  <Mail className="h-4 w-4" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-[#030A12] text-white border border-[#08243A] focus:border-[#168CFF] rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && mode !== 'confirmReset' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-[#526A7E] font-semibold block">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                    className="text-[11px] text-[#42D9FF] hover:underline font-bold"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#526A7E]">
                  <Lock className="h-4 w-4" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#030A12] text-white border border-[#08243A] focus:border-[#168CFF] rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'confirmReset' && (
            <div className="space-y-1">
              <label className="text-xs text-[#526A7E] font-semibold block">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#526A7E]">
                  <Lock className="h-4 w-4" />
                </div>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#030A12] text-white border border-[#08243A] focus:border-[#168CFF] rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'signin' && (
            <div className="flex items-center space-x-2 pt-1">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-[#030A12] border-[#08243A] text-[#168CFF] focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="remember" className="text-[11px] text-[#526A7E] select-none cursor-pointer">
                Remember session on this browser
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-1.5 bg-[#168CFF] hover:bg-[#42D9FF] py-3 rounded-xl text-white hover:text-[#000000] font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50 transition-all"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>
                  {mode === 'forgot' ? 'Sending Reset Instructions...' : 'Processing...'}
                </span>
              </div>
            ) : (
              <span>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Free Account'}
                {mode === 'forgot' && 'Send Reset Instructions'}
                {mode === 'confirmReset' && 'Save New Password'}
              </span>
            )}
          </button>
        </form>

        {/* Switch mode links */}
        <div className="text-center text-xs text-[#526A7E] border-t border-[#168CFF]/20 pt-4">
          {mode === 'signin' && (
            <p>
              New to AquaVerse?{' '}
              <button 
                onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
                className="text-[#42D9FF] font-bold hover:underline"
              >
                Create Account
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already have credentials?{' '}
              <button 
                onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                className="text-[#42D9FF] font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
          {(mode === 'forgot' || mode === 'confirmReset') && (
            <p>
              Back to{' '}
              <button 
                onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                className="text-[#42D9FF] font-bold hover:underline"
              >
                Sign In Screen
              </button>
            </p>
          )}
        </div>

      </motion.div>
    </div>
  );
}
