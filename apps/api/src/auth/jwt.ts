import crypto from 'node:crypto';
import { config } from '../config/env.js';

export type AuthTokenType = 'access' | 'refresh';

export type AimAuthTokenPayload = {
  sub: string;
  email: string;
  type: AuthTokenType;
  jti: string;
  iss: string;
  iat: number;
  exp: number;
};

type TokenOptions = {
  userId: string;
  email: string;
  type: AuthTokenType;
  ttlSeconds: number;
};

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function parseJson<T>(encoded: string): T {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
}

function sign(input: string): string {
  return crypto.createHmac('sha256', config.authJwtSecret).update(input).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signAuthToken(options: TokenOptions): { token: string; payload: AimAuthTokenPayload } {
  const now = Math.floor(Date.now() / 1000);
  const payload: AimAuthTokenPayload = {
    sub: options.userId,
    email: options.email,
    type: options.type,
    jti: crypto.randomUUID(),
    iss: config.authTokenIssuer,
    iat: now,
    exp: now + options.ttlSeconds
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  return { token: `${signingInput}.${sign(signingInput)}`, payload };
}

export function verifyAuthToken(token: string, expectedType: AuthTokenType): AimAuthTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed authentication token.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const header = parseJson<{ alg?: string; typ?: string }>(encodedHeader ?? '');
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Unsupported authentication token header.');
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  if (!safeEqual(sign(signingInput), signature ?? '')) {
    throw new Error('Invalid authentication token signature.');
  }

  const payload = parseJson<AimAuthTokenPayload>(encodedPayload ?? '');
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== config.authTokenIssuer) {
    throw new Error('Invalid authentication token issuer.');
  }
  if (payload.type !== expectedType) {
    throw new Error('Invalid authentication token type.');
  }
  if (payload.exp <= now) {
    throw new Error('Authentication token has expired.');
  }
  if (!payload.sub || !payload.email || !payload.jti) {
    throw new Error('Authentication token is missing required claims.');
  }

  return payload;
}

export function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token.trim();
}
