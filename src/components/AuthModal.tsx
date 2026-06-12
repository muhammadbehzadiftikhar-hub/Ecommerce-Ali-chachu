/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff,
  CornerDownRight
} from 'lucide-react';
import { 
  registerWithEmailPassword, 
  loginWithEmailPassword, 
  getSecurityQuestionByEmail, 
  recoverPasswordWithSecurityQuestion,
  resetPasswordWithEmail
} from '../services/authService';
import { loginWithGoogle } from '../lib/firebase';
import { useToast } from '../hooks/useToast';
import { ForgotPassword } from './ForgotPassword';
import { getFriendlyErrorMessage } from '../services/errorHandler';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'register' | 'forgot' | 'verify-recovery' | 'recovery-success' | 'forgot-firebase';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('What was the name of your first pet?');
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Password Recovery Flow State
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState('');

  const handleClose = () => {
    // Reset core states on close
    setEmail('');
    setPassword('');
    setName('');
    setSecurityAnswer('');
    setRecoveryAnswer('');
    setNewPassword('');
    setRecoveredPassword('');
    setMode('login');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      showToast('Successfully authenticated via Google accounts.', 'success');
      handleClose();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Google Authentication failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please provide both registered email and password credentials.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmailPassword(email, password);
      showToast('Welcome back! Signed in successfully.', 'success');
      handleClose();
    } catch (err: any) {
      console.error(err);
      showToast(getFriendlyErrorMessage(err, 'Incorrect email or password credential. Please review and retry.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !securityAnswer) {
      showToast('Please fulfill all required fields including your password recovery details.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Security standard: Password must contain at least 6 characters.', 'error');
      return;
    }

    setIsLoading(true);
    const finalQuestion = securityQuestion === 'custom' ? customQuestion : securityQuestion;
    try {
      await registerWithEmailPassword(
        email,
        password,
        name,
        finalQuestion || 'Default security hint',
        securityAnswer
      );
      showToast('Account successfully setup! Storing credentials securely in the database.', 'success');
      handleClose();
    } catch (err: any) {
      console.error(err);
      showToast(getFriendlyErrorMessage(err, 'Setup unsuccessful. This email address might belong to an active profile.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 of Recovery: Fetch user's security question
  const handleFetchRecoveryQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Please supply your account email address.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const details = await getSecurityQuestionByEmail(email);
      if (details) {
        setRecoveryQuestion(details.securityQuestion);
        setMode('verify-recovery');
        showToast('Account identified. Please resolve your configured security prompt.', 'success');
      } else {
        showToast('No registered user accounts found matching this email address.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to coordinate account recovery records.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 of Recovery: Verify answer and apply reset
  const handleResetWithAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryAnswer || !newPassword) {
      showToast('Please state both your security answer and chosen new password.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Security threshold: New password must contain at least 6 characters.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await recoverPasswordWithSecurityQuestion(email, recoveryAnswer, newPassword);
      if (result.success && result.recoveredPassword) {
        setRecoveredPassword(result.recoveredPassword);
        setMode('recovery-success');
        showToast('Identity validated! Stored password refreshed inside the database.', 'success');
      } else {
        showToast('Incorrect answer to security recovery question. Please study hint and retry.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Validation failed. Could not verify security credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Email link fallback
  const handleSendResetEmail = async () => {
    if (!email) {
      showToast('Please fill in your email address above first.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await resetPasswordWithEmail(email);
      showToast('Dispatch successful! Check your mailbox for the official reset connection.', 'success');
      handleClose();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to dispatch password recovery email.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose} 
      />

      {/* Main Modal Card */}
      <div className="relative bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 z-10 flex flex-col justify-between max-h-[90vh]">
        
        {/* Header decoration bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#1e293b] dark:to-[#0f172a] h-1.5 w-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-800 dark:text-slate-200" />
            <span className="font-sans font-semibold text-base text-slate-900 dark:text-white uppercase tracking-wider">
              {mode === 'login' && 'Sign In'}
              {mode === 'register' && 'Register Profile'}
              {(mode === 'forgot' || mode === 'verify-recovery' || mode === 'recovery-success' || mode === 'forgot-firebase') && 'Account Recovery'}
            </span>
          </div>

          <button 
            id="auth-modal-close-btn"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            
            {/* 1. LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <p className="text-xs font-sans text-slate-400">Secure entry to your private premium experience</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-sans font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="behzad@example.com"
                        className="w-full pl-10 pr-4 py-2 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-sans font-medium text-slate-500 uppercase tracking-wider">Password</label>
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setMode('forgot-firebase')}
                          className="text-xs font-sans text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer font-medium"
                        >
                          Forgot Password?
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 font-sans text-xs">|</span>
                        <button 
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-xs font-sans text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                          title="Recovery via registered security questions"
                        >
                          Security Hint
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="submit-login-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Log In'}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                  <span className="flex-shrink mx-4 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Or access with</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                </div>

                {/* Google OAuth Option */}
                <button
                  id="google-auth-btn"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google Connection</span>
                </button>

                <div className="pt-2 text-center">
                  <p className="text-xs font-sans text-slate-400">
                    New to the collective?{' '}
                    <button 
                      onClick={() => setMode('register')}
                      className="font-medium text-slate-800 dark:text-slate-200 underline cursor-pointer hover:text-slate-950"
                    >
                      Join / Register
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* 2. REGISTER MODE */}
            {mode === 'register' && (
              <motion.div
                key="register-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Behzad Iftikhar"
                        className="w-full pl-10 pr-4 py-1.5 text-xs font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-1.5 text-xs font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-slate-500 mb-1 uppercase tracking-wider">Password (Min 6 chars)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                      <input 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-1.5 text-xs font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Security Question Selection */}
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-slate-500 mb-1 uppercase tracking-wider">Recovery Security Question</label>
                    <select
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                    >
                      <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                      <option value="In what city were you born?">In what city were you born?</option>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What is your favorite book?">What is your favorite book?</option>
                      <option value="custom">Write a custom security question...</option>
                    </select>
                  </div>

                  {/* Custom Question Entry */}
                  {securityQuestion === 'custom' && (
                    <div>
                      <label className="block text-[10px] font-sans font-bold text-slate-500 mb-1 uppercase tracking-wider">Custom Question</label>
                      <input 
                        type="text"
                        required
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="your security question hint..."
                        className="w-full px-3 py-1.5 text-xs font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Security Question Answer */}
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-slate-500 mb-1 uppercase tracking-wider">Security Question Answer</label>
                    <div className="relative">
                      <HelpCircle className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="your secret answer (stored safely)"
                        className="w-full pl-10 pr-4 py-1.5 text-xs font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    id="submit-register-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Create Account'}
                  </button>
                </form>

                <div className="pt-2 text-center">
                  <p className="text-xs font-sans text-slate-400">
                    Already registered?{' '}
                    <button 
                      onClick={() => setMode('login')}
                      className="font-medium text-slate-800 dark:text-slate-200 underline cursor-pointer hover:text-slate-950"
                    >
                      Login here
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* 3. FORGOT PASSWORD MODE */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <p className="text-xs font-sans text-slate-500">
                    If you have forgotten your password, enter your email below to look up your security question.
                  </p>
                </div>

                <form onSubmit={handleFetchRecoveryQuestion} className="space-y-4">
                  <div>
                    <label className="block text-xs font-sans font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Account Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    id="recovery-lookup-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Identify Account'}
                  </button>
                </form>

                {/* Email dispatch backup option */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                  <span className="flex-shrink mx-4 text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest">Or try standard email</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                </div>

                <button
                  id="recovery-email-btn"
                  type="button"
                  onClick={() => setMode('forgot-firebase')}
                  className="w-full py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>Standard Password Reset</span>
                </button>

                <div className="pt-2 text-center">
                  <button 
                    onClick={() => setMode('login')}
                    className="text-xs font-sans text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors underline cursor-pointer"
                  >
                    Back to Log In
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. VERIFY RECOVERY & RESET */}
            {mode === 'verify-recovery' && (
              <motion.div
                key="verify-recovery-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold text-indigo-500 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Security Question Challenge
                  </span>
                  <p className="text-sm font-sans font-medium text-slate-800 dark:text-slate-150 leading-relaxed italic">
                    "{recoveryQuestion}"
                  </p>
                </div>

                <form onSubmit={handleResetWithAnswer} className="space-y-4">
                  {/* Security Answer */}
                  <div>
                    <label className="block text-xs font-sans font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Your Answer</label>
                    <div className="relative">
                      <HelpCircle className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={recoveryAnswer}
                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                        placeholder="Write your secret answer here..."
                        className="w-full pl-10 pr-4 py-2 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-sans font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Choose New Password (Min 6 chars)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    id="submit-reset-pw-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Restore Access & Keep Password'}
                  </button>
                </form>

                <div className="pt-2 text-center">
                  <button 
                    onClick={() => setMode('forgot')}
                    className="text-xs font-sans text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors underline cursor-pointer"
                  >
                    Back to Account Lookup
                  </button>
                </div>
              </motion.div>
            )}

            {/* 5. SUCCESS RECOVERY */}
            {mode === 'recovery-success' && (
              <motion.div
                key="recovery-success-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="space-y-5 text-center py-4"
              >
                <div className="mx-auto w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-sans font-semibold text-lg text-slate-900 dark:text-white">Credentials Recovered</h3>
                  <p className="text-xs font-sans text-slate-500 max-w-sm mx-auto">
                    Your unique password has been updated in the database and is verified for account logins.
                  </p>
                </div>

                {/* Password display card */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 select-all">
                  <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest block">Active Verified Password</span>
                  <code className="text-sm font-mono font-bold text-slate-900 dark:text-white tracking-wider px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 shadow-sm inline-block">
                    {recoveredPassword}
                  </code>
                </div>

                <button
                  id="go-to-login-btn"
                  onClick={() => {
                    setMode('login');
                    setPassword(recoveredPassword);
                  }}
                  className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CornerDownRight className="w-4 h-4" />
                  <span>Proceed to Log In</span>
                </button>
              </motion.div>
            )}

            {/* 6. FIREBASE STANDARD RESET EMAIL MODE */}
            {mode === 'forgot-firebase' && (
              <motion.div
                key="forgot-firebase-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <ForgotPassword onBackToLogin={() => setMode('login')} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Modal Footer helper */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-[10px] font-sans font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Fireside Server Authority Protocol</span>
        </div>

      </div>
    </div>
  );
}
