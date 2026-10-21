const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('nlpchat_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (url, opts) => apiRequest(url, { ...opts, method: 'GET' }),
  post: (url, body, opts) => apiRequest(url, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  patch: (url, body, opts) => apiRequest(url, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url, opts) => apiRequest(url, { ...opts, method: 'DELETE' })
};
