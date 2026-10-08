import { and, eq } from 'drizzle-orm';
import { createDb, schema } from '@velozy/db';
import type { Environment } from '../config/env.js';
import { decryptCredentials, encryptCredentials } from './integration-secrets.js';
import { HttpError } from '../middleware/errors.js';

export async function googleToken(environment: Environment, db: ReturnType<typeof createDb>, projectId: string, provider: 'google_analytics' | 'search_console') {
  if (!environment.INTEGRATION_ENCRYPTION_KEY || !/^[\da-f]{64}$/i.test(environment.INTEGRATION_ENCRYPTION_KEY))
    throw new HttpError(503, 'Configure a 32-byte integration encryption key before connecting Google', 'integration_encryption_unavailable');
  const connection = await db.query.growthConnections.findFirst({ where: and(eq(schema.growthConnections.projectId, projectId), eq(schema.growthConnections.provider, provider)) });
  if (!connection || connection.status !== 'connected') throw new HttpError(409, 'Connect this Google source first', 'growth_source_not_connected');
  const credentials = decryptCredentials(environment.INTEGRATION_ENCRYPTION_KEY, connection.encryptedCredentials);
  const expiresAt = Number(credentials.expiresAt || 0);
  if (expiresAt > Date.now() + 60_000 && credentials.accessToken) return { connection, accessToken: credentials.accessToken };
  if (!credentials.refreshToken || !environment.GOOGLE_OAUTH_CLIENT_ID || !environment.GOOGLE_OAUTH_CLIENT_SECRET)
    throw new HttpError(409, 'Reconnect this Google source to refresh access', 'growth_reconnect_required');
  const form = new URLSearchParams({ client_id: environment.GOOGLE_OAUTH_CLIENT_ID, client_secret: environment.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: credentials.refreshToken, grant_type: 'refresh_token' });
  const refreshed = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form, signal: AbortSignal.timeout(12_000) });
  const data = await refreshed.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!refreshed.ok || !data.access_token) {
    await db.update(schema.growthConnections).set({ status: 'reconnect_required', lastError: 'Google authorization expired', updatedAt: new Date() }).where(eq(schema.growthConnections.id, connection.id));
    throw new HttpError(409, 'Reconnect this Google source', 'growth_reconnect_required');
  }
  const updated = { ...credentials, accessToken: data.access_token, expiresAt: String(Date.now() + (data.expires_in ?? 3600) * 1000) };
  await db.update(schema.growthConnections).set({ encryptedCredentials: encryptCredentials(environment.INTEGRATION_ENCRYPTION_KEY, updated), updatedAt: new Date() }).where(eq(schema.growthConnections.id, connection.id));
  return { connection, accessToken: data.access_token };
}

export async function googleJson<T>(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json', ...init.headers }, signal: AbortSignal.timeout(15_000) });
  const body = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new HttpError(response.status === 403 ? 403 : 502, body.error?.message || 'Google could not return this report', 'google_api_failed');
  return body;
}
