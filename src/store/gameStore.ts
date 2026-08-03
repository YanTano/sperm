/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, UserAccount, GlobalLeaderboardEntry } from '../shared/types';

const CELL_COLORS = [
  '#ffffff', // Pearlescent White
  '#8be9fd', // Electric Cyan
  '#ff7eb3', // Soft Pink
  '#f1fa8c', // Golden Pearl
  '#bd93f9', // Violet Pearl
  '#50fa7b', // Mint Pearl
];

interface GameStore {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  
  // Auth & Profile state
  currentUser: UserAccount | null;
  token: string | null;
  guestName: string;
  guestColor: string;
  authModalOpen: boolean;
  authTab: 'login' | 'register' | 'profile';
  authError: string | null;
  authLoading: boolean;
  globalLeaderboard: GlobalLeaderboardEntry[];
  leaderboardTab: 'live' | 'global';

  // Actions
  connect: () => void;
  checkAuthSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, color?: string) => Promise<boolean>;
  logout: () => void;
  setGuestName: (name: string) => void;
  setGuestColor: (color: string) => void;
  updateUserColor: (color: string) => Promise<void>;
  openAuthModal: (tab?: 'login' | 'register' | 'profile') => void;
  closeAuthModal: () => void;
  fetchGlobalLeaderboard: () => Promise<void>;
  setLeaderboardTab: (tab: 'live' | 'global') => void;

  joinGame: () => void;
  sendPlayerState: (data: any) => void;
  sendCollectOrb: (orbId: string) => void;
}

export const globalGameState: { current: GameState | null } = { current: null };
let lastUiUpdate = 0;

function createInitialOfflineState(): GameState {
  const orbs: Record<string, { x: number; y: number; color: string }> = {};
  for (let i = 0; i < 200; i++) {
    orbs[`orb_${i}`] = {
      x: (Math.random() - 0.5) * 180,
      y: (Math.random() - 0.5) * 180,
      color: CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)],
    };
  }
  return {
    players: {},
    orbs,
    leaderboard: [],
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: null,
  playerId: null,

  currentUser: null,
  token: localStorage.getItem('snake_auth_token') || null,
  guestName: localStorage.getItem('snake_guest_name') || `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
  guestColor: localStorage.getItem('snake_guest_color') || '#ffffff',
  authModalOpen: false,
  authTab: 'login',
  authError: null,
  authLoading: false,
  globalLeaderboard: [],
  leaderboardTab: 'live',

  connect: () => {
    if (get().socket) return;
    
    if (!globalGameState.current) {
      globalGameState.current = createInitialOfflineState();
      set({ gameState: { ...globalGameState.current } });
    }

    const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
    const serverUrl = isFile ? 'http://localhost:3000' : undefined;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 3000,
    });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('init', (id: string) => {
      set({ playerId: id });
      if (globalGameState.current) {
        set({ gameState: { ...globalGameState.current } });
      }
    });

    socket.on('state', (state: GameState) => {
      globalGameState.current = state;
      const now = Date.now();
      const myId = get().playerId;
      const currentPlayer = myId ? state.players[myId] : null;
      const prevPlayer = myId ? get().gameState?.players[myId] : null;

      // Force immediate update if player state changed (e.g. joined, respawned, or died)
      const stateChanged = currentPlayer?.state !== prevPlayer?.state || !get().gameState;

      if (stateChanged || now - lastUiUpdate > 80) {
        set({ gameState: state });
        lastUiUpdate = now;
      }
    });

    set({ socket });
    get().checkAuthSession();
    get().fetchGlobalLeaderboard();
  },

  checkAuthSession: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
      const apiPrefix = isFile ? 'http://localhost:3000' : '';
      const res = await fetch(`${apiPrefix}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        set({ currentUser: data.user, authError: null });
      } else {
        localStorage.removeItem('snake_auth_token');
        set({ currentUser: null, token: null });
      }
    } catch {
      // Ignore network failures for local session fallback
    }
  },

  login: async (username, password) => {
    set({ authLoading: true, authError: null });
    try {
      const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
      const apiPrefix = isFile ? 'http://localhost:3000' : '';
      const res = await fetch(`${apiPrefix}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        set({ authError: data.error || 'Login failed', authLoading: false });
        return false;
      }

      localStorage.setItem('snake_auth_token', data.token);
      set({
        currentUser: data.user,
        token: data.token,
        authModalOpen: false,
        authLoading: false,
        authError: null
      });
      get().fetchGlobalLeaderboard();
      return true;
    } catch {
      set({ authError: 'Server error. Please try again.', authLoading: false });
      return false;
    }
  },

  register: async (username, password, color) => {
    set({ authLoading: true, authError: null });
    try {
      const selectedColor = color || get().guestColor;
      const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
      const apiPrefix = isFile ? 'http://localhost:3000' : '';
      const res = await fetch(`${apiPrefix}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, color: selectedColor })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        set({ authError: data.error || 'Registration failed', authLoading: false });
        return false;
      }

      localStorage.setItem('snake_auth_token', data.token);
      set({
        currentUser: data.user,
        token: data.token,
        authModalOpen: false,
        authLoading: false,
        authError: null
      });
      get().fetchGlobalLeaderboard();
      return true;
    } catch {
      set({ authError: 'Server error. Please try again.', authLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('snake_auth_token');
    set({ currentUser: null, token: null, authModalOpen: false });
  },

  setGuestName: (name) => {
    const trimmed = name.trim().slice(0, 16) || 'Guest';
    localStorage.setItem('snake_guest_name', trimmed);
    set({ guestName: trimmed });
  },

  setGuestColor: (color) => {
    localStorage.setItem('snake_guest_color', color);
    set({ guestColor: color });
  },

  updateUserColor: async (color) => {
    const { token } = get();
    if (token) {
      try {
        const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
        const apiPrefix = isFile ? 'http://localhost:3000' : '';
        const res = await fetch(`${apiPrefix}/api/auth/update-color`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ color })
        });
        const data = await res.json();
        if (data.success && data.user) {
          set({ currentUser: data.user });
        }
      } catch (e) {
        console.error('Failed to update color', e);
      }
    } else {
      get().setGuestColor(color);
    }
  },

  openAuthModal: (tab = 'login') => {
    set({ authModalOpen: true, authTab: tab, authError: null });
  },

  closeAuthModal: () => {
    set({ authModalOpen: false, authError: null });
  },

  fetchGlobalLeaderboard: async () => {
    try {
      const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
      const apiPrefix = isFile ? 'http://localhost:3000' : '';
      const res = await fetch(`${apiPrefix}/api/leaderboard/global`);
      const data = await res.json();
      if (data.success && Array.isArray(data.leaderboard)) {
        set({ globalLeaderboard: data.leaderboard });
      }
    } catch {
      // Ignore
    }
  },

  setLeaderboardTab: (tab) => {
    set({ leaderboardTab: tab });
    if (tab === 'global') {
      get().fetchGlobalLeaderboard();
    }
  },

  joinGame: () => {
    let { socket, currentUser, token, guestName, guestColor, playerId } = get();

    if (!socket) {
      get().connect();
      socket = get().socket;
    }

    // Blur active inputs so arrow/wasd keyboard controls work immediately
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
      window.focus();
    }

    const payload = (currentUser && token) 
      ? { name: currentUser.username, color: currentUser.color || '#ffffff', userId: currentUser.id }
      : { name: guestName, color: guestColor || '#ffffff' };

    if (socket && socket.connected) {
      socket.emit('join', payload);
    } else {
      if (socket) {
        socket.once('connect', () => {
          socket.emit('join', payload);
        });
        socket.connect();
      }

      // Offline / immediate local join so game starts instantly on PLAY NOW click
      const localId = playerId || `local_${Math.floor(Math.random() * 100000)}`;
      if (!globalGameState.current) {
        globalGameState.current = createInitialOfflineState();
      }

      globalGameState.current.players[localId] = {
        id: localId,
        name: payload.name,
        color: payload.color,
        score: 0,
        highScore: 0,
        segments: [{ x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40 }],
        angle: 0,
        state: 'alive',
      };

      set({
        playerId: localId,
        gameState: { ...globalGameState.current },
      });
    }
  },

  sendPlayerState: (data) => {
    const { socket, playerId } = get();
    if (socket && socket.connected) {
      socket.emit('update_state', data);
    } else if (playerId && globalGameState.current && globalGameState.current.players[playerId]) {
      const player = globalGameState.current.players[playerId];
      player.segments = data.segments || player.segments;
      player.score = data.score !== undefined ? data.score : player.score;
      player.angle = data.angle !== undefined ? data.angle : player.angle;
      if (data.state) player.state = data.state;

      const now = Date.now();
      if (now - lastUiUpdate > 80) {
        set({ gameState: { ...globalGameState.current } });
        lastUiUpdate = now;
      }
    }
  },

  sendCollectOrb: (orbId) => {
    const { socket, playerId } = get();
    if (socket && socket.connected) {
      socket.emit('collect_orb', orbId);
    } else if (globalGameState.current) {
      delete globalGameState.current.orbs[orbId];
      if (playerId && globalGameState.current.players[playerId]) {
        globalGameState.current.players[playerId].score += 10;
      }
      const newOrbId = `orb_${Date.now()}_${Math.random()}`;
      globalGameState.current.orbs[newOrbId] = {
        x: (Math.random() - 0.5) * 180,
        y: (Math.random() - 0.5) * 180,
        color: CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)],
      };
      set({ gameState: { ...globalGameState.current } });
    }
  },
}));
