import { getServerConfig } from '../config/serverConfig';
import type { Collection, SyncableEntity } from '../types';

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const { baseUrl, token } = getServerConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${options.method ?? 'GET'} ${path} -> ${res.status}`);
  }
  return res;
}

export async function fetchManifest(collection: Collection): Promise<{ id: string }[]> {
  const res = await request(`/api/${collection}/manifest`);
  return res.json();
}

export async function fetchItem<T extends SyncableEntity>(
  collection: Collection,
  id: string,
): Promise<T | null> {
  try {
    const res = await request(`/api/${collection}/${id}`);
    return res.json();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function putItem<T extends SyncableEntity>(collection: Collection, item: T): Promise<T> {
  const res = await request(`/api/${collection}/${item.id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await request('/api/health');
    const body = await res.json();
    return body.ok === true;
  } catch {
    return false;
  }
}
