import crypto from 'node:crypto';
import { config } from '../config/env.js';

const PBKDF2_ALGORITHM = 'sha256';
const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_KEY_LENGTH = 32;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_ALGORITHM).toString('hex');
  return `pbkdf2_${PBKDF2_ALGORITHM}$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts[0] === `pbkdf2_${PBKDF2_ALGORITHM}` && parts.length === 4) {
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expectedHash = parts[3];
    if (!Number.isInteger(iterations) || iterations <= 0 || !salt || !expectedHash) return false;
    const actualHash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEY_LENGTH, PBKDF2_ALGORITHM).toString('hex');
    return safeEqual(actualHash, expectedHash);
  }

  // LOCAL/TEST compatibility only for pre-existing placeholder demo hashes in the sprint baseline seed.
  // Production users must use migrated real password hashes.
  if (config.allowLocalDemoAuth && storedHash.includes('placeholder')) {
    return password === config.authLocalDemoPassword;
  }

  return false;
}
