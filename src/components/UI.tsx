/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Trophy, User, LogIn, UserPlus, Globe, Flame, Palette } from 'lucide-react';
import { AuthModal } from './AuthModal';

const COLOR_SWATCHES = [
  '#ffffff', // Pearlescent White
  '#8be9fd', // Electric Cyan
  '#ff7eb3', // Soft Pink
  '#f1fa8c', // Golden Pearl
  '#bd93f9', // Violet Pearl
  '#50fa7b', // Mint Pearl
];

export function UI() {
  const {
    gameState,
    playerId,
    joinGame,
    currentUser,
    guestName,
    guestColor,
    openAuthModal,
    setGuestName,
    setGuestColor,
    updateUserColor,
    leaderboardTab,
    setLeaderboardTab,
    globalLeaderboard,
  } = useGameStore();

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto relative z-20">
        <div className="flex flex-col gap-1 z-10">
          <h1 className="text-3xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
            NEON.SPERM
          </h1>
          {isAlive && (
            <div className="text-xl font-mono text-white/80 font-bold">
              Length: {Math.floor(player.score)}
            </div>
          )}
        </div>
        
        {/* Controls Hint */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex gap-2 opacity-80 pointer-events-none hidden sm:flex">
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">A</span>
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">D</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Turn</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">SPACE</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Boost</span>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10">
          {/* Account / Guest Badge */}
          {currentUser ? (
            <button
              onClick={() => openAuthModal('profile')}
              className="flex items-center gap-2.5 px-4 py-2 bg-zinc-900/90 hover:bg-zinc-800/90 border border-white/15 rounded-full text-white text-xs font-bold transition-all shadow-lg backdrop-blur-md"
              id="account-badge-btn"
            >
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: currentUser.color, boxShadow: `0 0 8px ${currentUser.color}` }}
              />
              <span>{currentUser.username}</span>
              <span className="text-[10px] text-yellow-400 font-mono bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">
                ★ {currentUser.highScore}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('profile')}
                className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-xs font-bold transition-all backdrop-blur-md"
                id="guest-badge-btn"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: guestColor }}
                />
                <span className="text-white/70">{guestName}</span>
                <span className="text-[10px] text-white/40 uppercase font-mono">GUEST</span>
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all shadow-md"
                id="header-login-btn"
              >
                <LogIn size={13} />
                <span>SIGN IN</span>
              </button>
            </div>
          )}

          <button
            onClick={handleOpenNewTab}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold transition-colors"
            id="new-tab-btn"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">New Tab</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Panel */}
      <div className="absolute top-20 right-4 w-72 bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 pointer-events-auto z-10 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white/90 font-bold text-xs">
            <Trophy size={16} className="text-yellow-400" />
            <span>LEADERBOARD</span>
          </div>

          {/* Leaderboard Tab Switcher */}
          <div className="flex bg-black/50 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setLeaderboardTab('live')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${
                leaderboardTab === 'live'
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Flame size={10} className="text-orange-400" />
              <span>LIVE</span>
            </button>
            <button
              onClick={() => setLeaderboardTab('global')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${
                leaderboardTab === 'global'
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Globe size={10} className="text-blue-400" />
              <span>ALL-TIME</span>
            </button>
          </div>
        </div>

        {/* Live Match Leaderboard */}
        {leaderboardTab === 'live' && (
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
            {gameState && gameState.leaderboard.length > 0 ? (
              gameState.leaderboard.map((entry, i) => (
                <div key={entry.id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-white/40 w-4 font-mono font-bold text-[11px]">{i + 1}.</span>
                    <span style={{ color: entry.color }} className="font-semibold truncate max-w-[130px]">
                      {entry.name}
                    </span>
                  </div>
                  <span className="font-mono text-white/80 font-bold">{entry.score}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-white/40 py-4 font-mono">
                No active snakes
              </div>
            )}
          </div>
        )}

        {/* Global All-Time Leaderboard */}
        {leaderboardTab === 'global' && (
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
            {globalLeaderboard.length > 0 ? (
              globalLeaderboard.map((entry, i) => (
                <div key={entry.username} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-white/40 w-4 font-mono font-bold text-[11px]">{i + 1}.</span>
                    <span style={{ color: entry.color }} className="font-semibold truncate max-w-[130px]">
                      {entry.username}
                    </span>
                  </div>
                  <span className="font-mono text-yellow-400 font-bold">{entry.highScore}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-white/40 py-4 font-mono">
                No registered scores yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Start / Respawn Arena Overlay */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/65 backdrop-blur-md z-30"
          >
            <div className="bg-zinc-900/95 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full flex flex-col items-center gap-6 text-white relative">
              {isDead ? (
                <div className="text-center">
                  <h2 className="text-4xl font-black text-red-500 mb-2 tracking-tight">YOU DIED</h2>
                  <p className="text-white/70 text-sm font-mono">
                    Final Length: <span className="text-white font-bold text-lg">{Math.floor(player.score)}</span>
                  </p>
                  {currentUser && Math.floor(player.score) > currentUser.highScore && (
                    <div className="mt-2 text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full inline-block">
                      NEW HIGH SCORE RECORD! 🎉
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">JOIN ARENA</h2>
                  <p className="text-white/60 text-xs">Steer with A/D or Left/Right. Hold Space to Boost.</p>
                </div>
              )}

              {/* Player Identity Selector Card */}
              <div className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col gap-3">
                {currentUser ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-black"
                        style={{ backgroundColor: currentUser.color }}
                      >
                        {currentUser.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {currentUser.username}
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                            LOGGED IN
                          </span>
                        </div>
                        <div className="text-xs text-white/50 font-mono">High Score: {currentUser.highScore}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => openAuthModal('profile')}
                      className="text-xs text-white/60 hover:text-white underline font-semibold"
                    >
                      Settings
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white/70">PLAYING AS GUEST</span>
                      <button
                        onClick={() => openAuthModal('register')}
                        className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={12} />
                        Save High Score
                      </button>
                    </div>

                    <input
                      type="text"
                      maxLength={16}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          joinGame();
                        }
                      }}
                      placeholder="Enter guest nickname"
                      className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                      id="guest-name-input"
                    />

                    {/* Color Swatch Picker for Guest */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-white/50 flex items-center gap-1">
                        <Palette size={12} /> Color:
                      </span>
                      <div className="flex gap-1.5">
                        {COLOR_SWATCHES.map((color) => (
                          <button
                            key={color}
                            onClick={() => setGuestColor(color)}
                            className={`w-6 h-6 rounded-full transition-all ${
                              guestColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={joinGame}
                className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black text-base rounded-xl transition-all shadow-xl active:scale-95"
                id="join-arena-btn"
              >
                {isDead ? 'RESPAWN NOW' : 'PLAY NOW'}
              </button>

              {!currentUser && (
                <div className="text-center text-xs text-white/40">
                  Want to appear on the global leaderboard?{' '}
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-blue-400 font-bold hover:underline"
                  >
                    Log in
                  </button>{' '}
                  or{' '}
                  <button
                    onClick={() => openAuthModal('register')}
                    className="text-purple-400 font-bold hover:underline"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
}
