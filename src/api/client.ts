import { FinancialItem, Payment } from '../types';

const API_BASE_KEY = 'loandash_api_base';

export function getApiBase(): string {
  return localStorage.getItem(API_BASE_KEY) || '';
}

export function setApiBase(url: string) {
  localStorage.setItem(API_BASE_KEY, url.replace(/\/+$/, ''));
}

export function clearApiBase() {
  localStorage.removeItem(API_BASE_KEY);
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const base = getApiBase();
  if (!base) throw new Error('No API server configured');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${base}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function apiCheckServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiGetItems(): Promise<FinancialItem[]> {
  return apiFetch('/api/items');
}

export async function apiCreateItem(item: Omit<FinancialItem, 'id'>): Promise<FinancialItem> {
  return apiFetch('/api/items', { method: 'POST', body: JSON.stringify(item) });
}

export async function apiUpdateItem(item: FinancialItem): Promise<FinancialItem> {
  return apiFetch(`/api/items/${item.id}`, { method: 'PUT', body: JSON.stringify(item) });
}

export async function apiDeleteItem(id: string): Promise<void> {
  await apiFetch(`/api/items/${id}`, { method: 'DELETE' });
}

export async function apiReorderItems(itemIds: string[]): Promise<void> {
  await apiFetch('/api/items/reorder', { method: 'PUT', body: JSON.stringify({ orders: itemIds }) });
}

export async function apiAddPayment(itemId: string, payment: Omit<Payment, 'id'>): Promise<Payment> {
  return apiFetch(`/api/items/${itemId}/payments`, { method: 'POST', body: JSON.stringify(payment) });
}

export async function apiAddBulkPayments(itemId: string, payments: Omit<Payment, 'id'>[]): Promise<Payment[]> {
  return apiFetch(`/api/items/${itemId}/payments/bulk`, { method: 'POST', body: JSON.stringify({ payments }) });
}

export async function apiUpdatePayment(itemId: string, paymentId: string, payment: Omit<Payment, 'id'>): Promise<Payment> {
  return apiFetch(`/api/items/${itemId}/payments/${paymentId}`, { method: 'PUT', body: JSON.stringify(payment) });
}

export async function apiDeletePayment(itemId: string, paymentId: string): Promise<void> {
  await apiFetch(`/api/items/${itemId}/payments/${paymentId}`, { method: 'DELETE' });
}

export async function apiGetSettings() {
  return apiFetch('/api/settings');
}

export async function apiUpdateSettings(settings: { theme?: string; currency?: string; notificationsEnabled?: boolean; cardOrders?: Record<string, string[]> }) {
  return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function apiExportData() {
  return apiFetch('/api/data/export');
}

export async function apiImportData(data: { financialItems: FinancialItem[]; settings?: any }) {
  return apiFetch('/api/data/import', { method: 'POST', body: JSON.stringify(data) });
}

export function isOnlineMode(): boolean {
  return !!getApiBase();
}
