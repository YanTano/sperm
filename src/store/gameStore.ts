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

const BOT_NAMES = ['ViperCell', 'TurboSperm', 'PearlSwimmer', 'AcroCap', 'GridGamete', 'AquaMotile'];

interface LocalUser {
  id: string;
  username: string;
  passwordHash: string;
  color: string;
  highScore: number;
  gamesPlayed: number;
  totalScore: number;
}

function getLocalUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem('snake_local_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUser[]) {
  try {
    localStorage.setItem('snake_local_users', JSON.stringify(users));
  } catch {
    // ignore
  }
}

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
let offlineTickTimer: ReturnType<typeof setInterval> | null = null;

function createInitialOfflineState(): GameState {
  const orbs: Record<string, { id: string; x: number; y: number; value: number; color: string }> = {};
  for (let i = 0; i < 200; i++) {
    const id = `orb_${i}`;
    orbs[id] = {
      id,
      x: (Math.random() - 0.5) * 180,
      y: (Math.random() - 0.5) * 180,
      value: 1,
      color: CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)],
    };
  }

  const players: Record<string, Player> = {};
  BOT_NAMES.forEach((name, idx) => {
    const botId = `bot_${idx}`;
    const startX = (Math.random() - 0.5) * 120;
    const startY = (Math.random() - 0.5) * 120;
    const angle = Math.random() * Math.PI * 2;
    const initialScore = 15 + Math.floor(Math.random() * 25);
    const segments = [];
    for (let s = 0; s < initialScore; s++) {
      segments.push({
        x: startX - Math.cos(angle) * s * 0.8,
        y: startY - Math.sin(angle) * s * 0.8,
      });
    }

    players[botId] = {
      id: botId,
      name,
      color: CELL_COLORS[(idx + 1) % CELL_COLORS.length],
      score: initialScore,
      segments,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
    };
  });

  const leaderboard = Object.values(players)
    .map(p => ({ id: p.id, name: p.name, score: Math.floor(p.score), color: p.color }))
    .sort((a, b) => b.score - a.score);

  return {
    players,
    orbs,
    leaderboard,
  };
}

function startOfflineSimulation(set: any, get: any) {
  if (offlineTickTimer) return;

  offlineTickTimer = setInterval(() => {
    const socket = get().socket;
    if (socket && socket.connected) return; // Online mode server handles state

    const gs = globalGameState.current;
    if (!gs) return;

    const dt = 0.08;
    const speed = 12;

    // Ensure AI bots are active in the arena
    BOT_NAMES.forEach((name, idx) => {
      const botId = `bot_${idx}`;
      if (!gs.players[botId] || gs.players[botId].state !== 'alive' || !gs.players[botId].segments || gs.players[botId].segments.length === 0) {
        const bx = (Math.random() - 0.5) * 120;
        const by = (Math.random() - 0.5) * 120;
        const bAngle = Math.random() * Math.PI * 2;
        const bScore = 15 + Math.floor(Math.random() * 25);
        const bSegments = [];
        for (let s = 0; s < bScore; s++) {
          bSegments.push({ x: bx - Math.cos(bAngle) * s * 0.8, y: by - Math.sin(bAngle) * s * 0.8 });
        }
        gs.players[botId] = {
          id: botId,
          name,
          color: CELL_COLORS[(idx + 1) % CELL_COLORS.length],
          score: bScore,
          segments: bSegments,
          isBoosting: false,
          state: 'alive',
          currentAngle: bAngle,
          inputs: { left: false, right: false, boost: false },
        };
      }
    });

    // Move AI Bots
    Object.values(gs.players).forEach((p) => {
      if (p.id.startsWith('bot_') && p.state === 'alive' && p.segments && p.segments.length > 0) {
        if (Math.random() < 0.1) {
          p.currentAngle += (Math.random() - 0.5) * 0.8;
        }

        const head = { ...p.segments[0] };
        head.x += Math.cos(p.currentAngle) * speed * dt;
        head.y += Math.sin(p.currentAngle) * speed * dt;

        const b = 75;
        if (Math.abs(head.x) > b || Math.abs(head.y) > b) {
          p.currentAngle += Math.PI * 0.7;
          head.x = Math.max(-b, Math.min(b, head.x));
          head.y = Math.max(-b, Math.min(b, head.y));
        }

        p.segments.unshift(head);
        const targetLen = Math.max(10, Math.floor(p.score));
        while (p.segments.length > targetLen) {
          p.segments.pop();
        }

        // Bot orb eating
        for (const orbId in gs.orbs) {
          const orb = gs.orbs[orbId];
          const dx = head.x - orb.x;
          const dy = head.y - orb.y;
          if (dx * dx + dy * dy < 4) {
            p.score += 1;
            delete gs.orbs[orbId];
            const newOrbId = `orb_${Date.now()}_${Math.random()}`;
            gs.orbs[newOrbId] = {
              id: newOrbId,
              x: (Math.random() - 0.5) * 160,
              y: (Math.random() - 0.5) * 160,
              value: 1,
              color: CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)],
            };
            break;
          }
        }
      }
    });

    // Compute Live Leaderboard
    const sortedLeaderboard = Object.values(gs.players)
      .filter((p) => p.state === 'alive' && p.segments && p.segments.length > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: Math.floor(p.score),
        color: p.color,
      }))
      .sort((a, b) => b.score - a.score);

    gs.leaderboard = sortedLeaderboard;

    const now = Date.now();
    if (now - lastUiUpdate > 80) {
      set({ gameState: { ...gs } });
      lastUiUpdate = now;
    }
  }, 80);
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
    if (!globalGameState.current) {
      globalGameState.current = createInitialOfflineState();
      set({ gameState: { ...globalGameState.current } });
    }

    startOfflineSimulation(set, get);

    const isStaticHost = typeof window !== 'undefined' && (
      window.location.protocol === 'file:' || 
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('github.app')
    );

    // Skip socket initialization on static GitHub Pages hosting
    if (isStaticHost) {
      get().checkAuthSession();
      get().fetchGlobalLeaderboard();
      return;
    }

    if (get().socket) return;

    try {
      const socket = io({
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
        if (state && state.players) {
          globalGameState.current = state;
          const now = Date.now();
          const myId = get().playerId;
          const currentPlayer = myId ? state.players[myId] : null;
          const prevPlayer = myId ? get().gameState?.players[myId] : null;

          const stateChanged = currentPlayer?.state !== prevPlayer?.state || !get().gameState;

          if (stateChanged || now - lastUiUpdate > 80) {
            set({ gameState: state });
            lastUiUpdate = now;
          }
        }
      });

      set({ socket });
    } catch {
      // Socket creation failed, offline mode active
    }

    get().checkAuthSession();
    get().fetchGlobalLeaderboard();
  },

  checkAuthSession: async () => {
    const token = get().token;
    if (!token) return;

    if (token.startsWith('local_token_')) {
      const userId = token.replace('local_token_', '');
      const users = getLocalUsers();
      const found = users.find((u) => u.id === userId);
      if (found) {
        set({
          currentUser: {
            id: found.id,
            username: found.username,
            color: found.color,
            highScore: found.highScore,
            gamesPlayed: found.gamesPlayed,
            totalScore: found.totalScore,
          },
          authError: null,
        });
        return;
      }
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.user) {
          set({ currentUser: data.user, authError: null });
          return;
        }
      }
    } catch {
      // Fallback
    }
  },

  login: async (username, password) => {
    set({ authLoading: true, authError: null });
    const cleanUsername = username.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
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
        } else {
          set({ authError: data.error || 'Login failed', authLoading: false });
          return false;
        }
      }
    } catch {
      // Server endpoint unavailable (e.g. static GitHub Pages)
    }

    // Local storage account fallback
    const users = getLocalUsers();
    const found = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (found && found.passwordHash === password) {
      const token = `local_token_${found.id}`;
      localStorage.setItem('snake_auth_token', token);
      set({
        currentUser: {
          id: found.id,
          username: found.username,
          color: found.color,
          highScore: found.highScore,
          gamesPlayed: found.gamesPlayed,
          totalScore: found.totalScore,
        },
        token,
        authModalOpen: false,
        authLoading: false,
        authError: null
      });
      get().fetchGlobalLeaderboard();
      return true;
    } else {
      set({ authError: 'Invalid username or password', authLoading: false });
      return false;
    }
  },

  register: async (username, password, color) => {
    set({ authLoading: true, authError: null });
    const selectedColor = color || get().guestColor;
    const cleanUsername = username.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      set({ authError: 'Username must be at least 3 characters', authLoading: false });
      return false;
    }
    if (!password || password.length < 4) {
      set({ authError: 'Password must be at least 4 characters', authLoading: false });
      return false;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password, color: selectedColor })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
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
        } else {
          set({ authError: data.error || 'Registration failed', authLoading: false });
          return false;
        }
      }
    } catch {
      // Fallback to local storage account
    }

    // Local storage account creation
    const users = getLocalUsers();
    if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      set({ authError: 'Username is already taken', authLoading: false });
      return false;
    }

    const newUser: LocalUser = {
      id: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: cleanUsername,
      passwordHash: password,
      color: selectedColor,
      highScore: 0,
      gamesPlayed: 0,
      totalScore: 0,
    };

    users.push(newUser);
    saveLocalUsers(users);

    const token = `local_token_${newUser.id}`;
    localStorage.setItem('snake_auth_token', token);
    set({
      currentUser: {
        id: newUser.id,
        username: newUser.username,
        color: newUser.color,
        highScore: newUser.highScore,
        gamesPlayed: newUser.gamesPlayed,
        totalScore: newUser.totalScore,
      },
      token,
      authModalOpen: false,
      authLoading: false,
      authError: null
    });
    get().fetchGlobalLeaderboard();
    return true;
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
    const { token, currentUser } = get();
    if (currentUser) {
      const updated = { ...currentUser, color };
      set({ currentUser: updated });

      if (token && token.startsWith('local_token_')) {
        const users = getLocalUsers();
        const idx = users.findIndex(u => u.id === currentUser.id);
        if (idx !== -1) {
          users[idx].color = color;
          saveLocalUsers(users);
        }
      } else if (token) {
        try {
          await fetch('/api/auth/update-color', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ color })
          });
        } catch (e) {
          console.error('Failed to update color', e);
        }
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
      const res = await fetch('/api/leaderboard/global');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.leaderboard)) {
          set({ globalLeaderboard: data.leaderboard });
          return;
        }
      }
    } catch {
      // Fallback below
    }

    // Local storage leaderboard
    const users = getLocalUsers();
    const leaderboard = users
      .map((u) => ({ username: u.username, color: u.color, highScore: u.highScore, gamesPlayed: u.gamesPlayed }))
      .sort((a, b) => b.highScore - a.highScore);
    set({ globalLeaderboard: leaderboard });
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

    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
      window.focus();
    }

    const payload = (currentUser && token) 
      ? { name: currentUser.username, color: currentUser.color || '#ffffff', userId: currentUser.id }
      : { name: guestName, color: guestColor || '#ffffff' };

    const isStaticHost = typeof window !== 'undefined' && (
      window.location.protocol === 'file:' || 
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('github.app')
    );

    if (socket && socket.connected && !isStaticHost) {
      socket.emit('join', payload);
    } else {
      // Offline / immediate local join so game starts instantly on PLAY NOW click
      const localId = playerId || `local_${Math.floor(Math.random() * 100000)}`;
      if (!globalGameState.current) {
        globalGameState.current = createInitialOfflineState();
      }

      // Ensure bots exist
      BOT_NAMES.forEach((name, idx) => {
        const botId = `bot_${idx}`;
        if (!globalGameState.current!.players[botId] || globalGameState.current!.players[botId].state !== 'alive') {
          const bx = (Math.random() - 0.5) * 120;
          const by = (Math.random() - 0.5) * 120;
          const bAngle = Math.random() * Math.PI * 2;
          const bScore = 15 + Math.floor(Math.random() * 25);
          const bSegments = [];
          for (let s = 0; s < bScore; s++) {
            bSegments.push({ x: bx - Math.cos(bAngle) * s * 0.8, y: by - Math.sin(bAngle) * s * 0.8 });
          }
          globalGameState.current!.players[botId] = {
            id: botId,
            name,
            color: CELL_COLORS[(idx + 1) % CELL_COLORS.length],
            score: bScore,
            segments: bSegments,
            isBoosting: false,
            state: 'alive',
            currentAngle: bAngle,
            inputs: { left: false, right: false, boost: false },
          };
        }
      });

      const spawnX = (Math.random() - 0.5) * 60;
      const spawnY = (Math.random() - 0.5) * 60;
      const initialAngle = Math.random() * Math.PI * 2;

      const initialSegments = [];
      for (let i = 0; i < 10; i++) {
        initialSegments.push({
          x: spawnX - Math.cos(initialAngle) * i * 0.8,
          y: spawnY - Math.sin(initialAngle) * i * 0.8,
        });
      }

      globalGameState.current.players[localId] = {
        id: localId,
        name: payload.name,
        color: payload.color,
        score: 10,
        segments: initialSegments,
        currentAngle: initialAngle,
        isBoosting: false,
        state: 'alive',
        inputs: { left: false, right: false, boost: false },
      };

      // Compute Live Leaderboard immediately
      const sortedLeaderboard = Object.values(globalGameState.current.players)
        .filter((p) => p.state === 'alive' && p.segments && p.segments.length > 0)
        .map((p) => ({
          id: p.id,
          name: p.name,
          score: Math.floor(p.score),
          color: p.color,
        }))
        .sort((a, b) => b.score - a.score);

      globalGameState.current.leaderboard = sortedLeaderboard;

      set({
        playerId: localId,
        gameState: { ...globalGameState.current },
      });
    }
  },

  sendPlayerState: (data) => {
    const { socket, playerId, currentUser } = get();
    if (socket && socket.connected) {
      socket.emit('update_state', data);
    } else if (playerId && globalGameState.current && globalGameState.current.players[playerId]) {
      const player = globalGameState.current.players[playerId];
      player.segments = data.segments || player.segments;
      player.score = data.score !== undefined ? data.score : player.score;
      player.currentAngle = data.currentAngle !== undefined ? data.currentAngle : player.currentAngle;
      player.isBoosting = !!data.isBoosting;
      if (data.state) player.state = data.state;

      // Update high score if logged in
      if (currentUser && Math.floor(player.score) > currentUser.highScore) {
        const newHigh = Math.floor(player.score);
        const updatedUser = { ...currentUser, highScore: newHigh };
        set({ currentUser: updatedUser });

        const users = getLocalUsers();
        const idx = users.findIndex((u) => u.id === currentUser.id);
        if (idx !== -1) {
          users[idx].highScore = newHigh;
          saveLocalUsers(users);
        }
        get().fetchGlobalLeaderboard();
      }

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
        globalGameState.current.players[playerId].score += 1;
      }
      const newOrbId = `orb_${Date.now()}_${Math.random()}`;
      globalGameState.current.orbs[newOrbId] = {
        id: newOrbId,
        x: (Math.random() - 0.5) * 180,
        y: (Math.random() - 0.5) * 180,
        value: 1,
        color: CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)],
      };
      set({ gameState: { ...globalGameState.current } });
    }
  },
}));
