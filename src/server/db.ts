import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('game.db');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    color TEXT NOT NULL,
    high_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export function hashPassword(password: string): string {
  const salt = 'neon_snake_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function createUser(username: string, password: string, color: string) {
  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const stmt = db.prepare(`
    INSERT INTO users (id, username, password_hash, color, high_score, games_played, total_score)
    VALUES (?, ?, ?, ?, 0, 0, 0)
  `);
  stmt.run(id, username, passwordHash, color || '#ff7eb3');
  return getUserById(id);
}

export function getUserByUsername(username: string) {
  const stmt = db.prepare('SELECT id, username, password_hash, color, high_score, games_played, total_score, created_at FROM users WHERE LOWER(username) = LOWER(?)');
  const user = stmt.get(username) as any;
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    passwordHash: user.password_hash,
    color: user.color,
    highScore: user.high_score,
    gamesPlayed: user.games_played,
    totalScore: user.total_score,
    createdAt: user.created_at,
  };
}

export function getUserById(id: string) {
  const stmt = db.prepare('SELECT id, username, color, high_score, games_played, total_score, created_at FROM users WHERE id = ?');
  const user = stmt.get(id) as any;
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    color: user.color,
    highScore: user.high_score,
    gamesPlayed: user.games_played,
    totalScore: user.total_score,
    createdAt: user.created_at,
  };
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function updateUserStats(userId: string, score: number) {
  const user = getUserById(userId);
  if (!user) return null;

  const newHighScore = Math.max(user.highScore, Math.floor(score));
  const newGamesPlayed = user.gamesPlayed + 1;
  const newTotalScore = user.totalScore + Math.floor(score);

  const stmt = db.prepare(`
    UPDATE users
    SET high_score = ?, games_played = ?, total_score = ?
    WHERE id = ?
  `);
  stmt.run(newHighScore, newGamesPlayed, newTotalScore, userId);

  return getUserById(userId);
}

export function updateUserColor(userId: string, color: string) {
  const stmt = db.prepare('UPDATE users SET color = ? WHERE id = ?');
  stmt.run(color, userId);
  return getUserById(userId);
}

export function getGlobalLeaderboard(limit = 10) {
  const stmt = db.prepare(`
    SELECT username, color, high_score as highScore, games_played as gamesPlayed
    FROM users
    ORDER BY high_score DESC
    LIMIT ?
  `);
  return stmt.all(limit) as { username: string; color: string; highScore: number; gamesPlayed: number }[];
}
