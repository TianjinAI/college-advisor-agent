import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'college-advisor-dev-secret-change-me';
const TOKEN_TTL = '30d';

interface UserEntry {
  userId: string;
  username: string;
  displayName: string;
  passwordHash: string;
}

interface UsersStore {
  [username: string]: UserEntry;
}

function getUsersPath(): string {
  return path.resolve(process.cwd(), 'server/auth/users.json');
}

function loadUsers(): UsersStore {
  const p = getUsersPath();
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * Verify username + password against users.json.
 * Returns the UserEntry on success, null on failure.
 */
export async function verifyLogin(
  username: string,
  password: string
): Promise<UserEntry | null> {
  const users = loadUsers();
  const user = users[username];
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

/**
 * Issue a JWT for a user. Payload: { userId, username, displayName }.
 */
export function issueToken(user: UserEntry): string {
  return jwt.sign(
    { userId: user.userId, username: user.username, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired.
 */
export function verifyToken(token: string): { userId: string; username: string; displayName: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; username: string; displayName: string };
  } catch {
    return null;
  }
}

/**
 * Express middleware: requires a valid JWT in Authorization: Bearer <token> header.
 * Attaches req.auth = { userId, username, displayName } on success.
 * Returns 401 on failure.
 */
export function authMiddleware(
  req: any,
  res: any,
  next: any
): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: no token provided' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    return;
  }
  req.auth = payload;
  next();
}

/**
 * Generate a bcrypt hash for a plaintext password.
 * Run from the server directory: node -e "const {hashPassword} = require('./auth/auth.js'); hashPassword('mypass').then(h => console.log(h))"
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
