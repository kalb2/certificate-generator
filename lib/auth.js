import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const SESSION_COOKIE = 'certificate_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 12;

function env(name) {
  return String(process.env[name] || '').trim();
}

export function authConfigured() {
  return Boolean(env('ADMIN_EMAIL') && env('ADMIN_PASSWORD'));
}

function signingSecret() {
  const explicit = env('AUTH_SECRET');
  if (explicit) return explicit;
  return createHmac('sha256', env('ADMIN_PASSWORD') || 'missing-password')
    .update(env('ADMIN_EMAIL') || 'missing-email')
    .digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function signature(payload) {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

export function validCredentials(email, password) {
  if (!authConfigured()) return false;
  return safeEqual(String(email || '').trim().toLowerCase(), env('ADMIN_EMAIL').toLowerCase())
    && safeEqual(String(password || ''), env('ADMIN_PASSWORD'));
}

export function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({
    email: env('ADMIN_EMAIL').toLowerCase(),
    exp: Date.now() + SESSION_MAX_AGE * 1000
  })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token) {
  try {
    if (!token || !authConfigured()) return false;
    const [payload, suppliedSignature] = String(token).split('.');
    if (!payload || !suppliedSignature || !safeEqual(signature(payload), suppliedSignature)) return false;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.exp > Date.now() && decoded.email === env('ADMIN_EMAIL').toLowerCase();
  } catch {
    return false;
  }
}

export async function isAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requirePageAuth() {
  if (!authConfigured()) redirect('/login?setup=1');
  if (!await isAuthenticated()) redirect('/login');
}

export async function requireApiAuth() {
  if (!authConfigured()) {
    return Response.json(
      { error: 'Admin login is not configured. Add ADMIN_EMAIL and ADMIN_PASSWORD in Vercel, then redeploy.' },
      { status: 503 }
    );
  }
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

export async function setSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}
