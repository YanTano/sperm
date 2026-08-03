/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, LogIn, UserPlus, LogOut, Trophy, Award, Palette, Check, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

const NEON_COLORS = [
  '#ffffff', // Pearlescent White
  '#8be9fd', // Electric Cyan
  '#ff7eb3', // Soft Pink
  '#f1fa8c', // Golden Pearl
  '#bd93f9', // Violet Pearl
  '#50fa7b', // Mint Pearl
];

export function AuthModal() {
  const {
    authModalOpen,
    authTab,
    authError,
    authLoading,
    currentUser,
    guestName,
    guestColor,
    closeAuthModal,
    login,
    register,
    logout,
    openAuthModal,
    setGuestName,
    setGuestColor,
    updateUserColor,
  } = useGameStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(currentUser?.color || guestColor || NEON_COLORS[0]);

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(username, password, selectedColor);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (currentUser) {
      updateUserColor(color);
    } else {
      setGuestColor(color);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="relative w-full max-w-md bg-zinc-900/95 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-white overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            id="close-auth-modal-btn"
          >
            <X size={18} />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {currentUser ? 'ACCOUNT PROFILE' : authTab === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
              </h2>
              <p className="text-xs text-white/50">
                {currentUser
                  ? 'Manage your stats, color & settings'
                  : authTab === 'login'
                  ? 'Sign in to sync high scores & customize snake'
                  : 'Register to claim your username on the leaderboard'}
              </p>
            </div>
          </div>

          {/* Tab Switcher (When not logged in) */}
          {!currentUser && (
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 mb-6">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  authTab === 'login'
                    ? 'bg-white/10 text-white shadow-lg border border-white/10'
                    : 'text-white/40 hover:text-white/80'
                }`}
                id="tab-login-btn"
              >
                <LogIn size={14} />
                <span>LOG IN</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  authTab === 'register'
                    ? 'bg-white/10 text-white shadow-lg border border-white/10'
                    : 'text-white/40 hover:text-white/80'
                }`}
                id="tab-register-btn"
              >
                <UserPlus size={14} />
                <span>REGISTER</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {authError}
            </div>
          )}

          {/* LOGGED IN PROFILE VIEW */}
          {currentUser ? (
            <div className="flex flex-col gap-6">
              {/* Profile Card */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-black shadow-lg"
                  style={{ backgroundColor: currentUser.color || selectedColor }}
                >
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base truncate">{currentUser.username}</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                      MEMBER
                    </span>
                  </div>
                  <p className="text-xs text-white/40 font-mono">ID: {currentUser.id.substring(0, 8)}...</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/40 border border-white/5 p-3 rounded-2xl text-center">
                  <div className="flex justify-center mb-1 text-yellow-400">
                    <Trophy size={16} />
                  </div>
                  <div className="text-lg font-black font-mono">{currentUser.highScore || 0}</div>
                  <div className="text-[10px] font-bold text-white/40 tracking-wider">HIGH SCORE</div>
                </div>

                <div className="bg-black/40 border border-white/5 p-3 rounded-2xl text-center">
                  <div className="flex justify-center mb-1 text-blue-400">
                    <Award size={16} />
                  </div>
                  <div className="text-lg font-black font-mono">{currentUser.gamesPlayed || 0}</div>
                  <div className="text-[10px] font-bold text-white/40 tracking-wider">GAMES</div>
                </div>

                <div className="bg-black/40 border border-white/5 p-3 rounded-2xl text-center">
                  <div className="flex justify-center mb-1 text-purple-400">
                    <Sparkles size={16} />
                  </div>
                  <div className="text-lg font-black font-mono">{currentUser.totalScore || 0}</div>
                  <div className="text-[10px] font-bold text-white/40 tracking-wider">TOTAL ORBS</div>
                </div>
              </div>

              {/* Customization Color Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                  <Palette size={14} className="text-pink-400" />
                  SPERM CELL COLOR PREFERENCE
                </label>
                <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5">
                  {NEON_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                      style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}80` }}
                    >
                      {(currentUser.color === c || selectedColor === c) && (
                        <Check size={14} className="text-black font-bold" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  id="logout-btn"
                >
                  <LogOut size={16} />
                  <span>LOG OUT</span>
                </button>
              </div>
            </div>
          ) : authTab === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">USERNAME</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  id="login-username-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">PASSWORD</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  id="login-password-input"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                id="login-submit-btn"
              >
                {authLoading ? 'LOGGING IN...' : 'LOG IN'}
              </button>

              <div className="text-center mt-2">
                <span className="text-xs text-white/40">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="text-xs text-blue-400 font-bold hover:underline"
                >
                  Register now
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">CHOOSE USERNAME</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="At least 3 characters"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  id="register-username-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">CHOOSE PASSWORD</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  id="register-password-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Palette size={14} className="text-pink-400" />
                  SPERM CELL COLOR PREFERENCE
                </label>
                <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5">
                  {NEON_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                      style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}80` }}
                    >
                      {selectedColor === c && <Check size={14} className="text-black font-bold" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50 mt-2"
                id="register-submit-btn"
              >
                {authLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>

              <div className="text-center mt-2">
                <span className="text-xs text-white/40">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-xs text-purple-400 font-bold hover:underline"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* GUEST NOTICE / QUICK ACCESS */}
          {!currentUser && (
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="text-xs text-white/40">Playing as Guest: <span className="text-white font-bold">{guestName}</span></div>
              <button
                type="button"
                onClick={closeAuthModal}
                className="text-xs font-bold text-white/60 hover:text-white underline"
                id="continue-guest-btn"
              >
                Continue as Guest
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
