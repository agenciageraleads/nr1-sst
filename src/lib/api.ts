const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type AppUser = {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  createdAt?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.message || payload.error || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: AppUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: AppUser }>('/me'),

  listUsers: () => request<{ users: AppUser[] }>('/users'),
  createUser: (data: { name: string; email: string; role: string; password?: string }) =>
    request<{ user: AppUser; temporaryPassword?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteUser: (email: string) => request<{ ok: true }>(`/users/${encodeURIComponent(email)}`, { method: 'DELETE' }),

  listCompanies: () => request<{ companies: any[] }>('/companies'),
  createCompany: (data: any) => request<{ company: any }>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: any) =>
    request<{ company: any }>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  listCampaigns: () => request<{ campaigns: any[] }>('/campaigns'),
  createCampaign: (data: any) => request<{ campaign: any }>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => request<{ ok: true }>(`/campaigns/${id}`, { method: 'DELETE' }),

  dashboardSummary: () =>
    request<{ totalCompanies: number; totalActiveCampaigns: number; totalResponses: number; lastEmployeeResponses: any[] }>(
      '/dashboard/summary'
    ),
  reports: () => request<{ reports: any[] }>('/reports'),
  results: (campaignId: string) => request<{ campaign: any | null; responses: any[] }>(`/results/${campaignId}`),
  report: (campaignId: string) => request<{ campaign: any | null; company: any | null; responses: any[] }>(`/reports/${campaignId}`),

  publicCompanyForm: (token: string) => request<{ campaign: any; company: any | null }>(`/public/company-form/${token}`),
  submitCompanyResponse: (data: any) =>
    request<{ id: string }>('/public/company-responses', { method: 'POST', body: JSON.stringify(data) }),
  publicEmployeeForm: (token: string) => request<{ campaign: any; company: any | null }>(`/public/employee-form/${token}`),
  submitEmployeeResponse: (data: any) =>
    request<{ id: string }>('/public/employee-responses', { method: 'POST', body: JSON.stringify(data) }),
};

export function formatDateValue(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}
