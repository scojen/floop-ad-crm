/**
 * Typed fetch client for ad-manager-api. Same shape as
 * frontend-floop/src/api/floopClient.ts: base URL + bearer token from
 * VITE_ env vars, plus the CRM-specific X-Actor-Id attribution header
 * (the rep selected in the RepPicker, persisted in localStorage).
 */

const BASE_URL: string =
  import.meta.env.VITE_CRM_BASE_URL ?? 'http://localhost:3001';
const TOKEN: string = import.meta.env.VITE_CRM_TOKEN ?? '';

/** Single-tenant client UUID every /clients/:clientId/... route uses. */
export const CLIENT_ID: string = import.meta.env.VITE_CRM_CLIENT_ID ?? '';

export const ACTOR_STORAGE_KEY = 'crm.actorId';

export function getActorId(): string | null {
  return localStorage.getItem(ACTOR_STORAGE_KEY);
}

export function setActorId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(ACTOR_STORAGE_KEY);
  } else {
    localStorage.setItem(ACTOR_STORAGE_KEY, id);
  }
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function headers(): Record<string, string> {
  const result: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (TOKEN) {
    result.Authorization = `Bearer ${TOKEN}`;
  }
  const actorId = getActorId();
  if (actorId) {
    result['X-Actor-Id'] = actorId;
  }
  return result;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `${method} ${path} failed (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (payload.message) {
        message = Array.isArray(payload.message)
          ? payload.message.join('; ')
          : payload.message;
      }
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export function getJson<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export function postJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

export function patchJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

/** Prefix for the single-tenant client's routes. */
export function clientPath(suffix: string): string {
  return `/clients/${CLIENT_ID}${suffix}`;
}
