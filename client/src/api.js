const BASE_URL = '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/auth/me', { token }),

  getLeaveTypes: (token) => request('/leave-types', { token }),
  createLeaveType: (token, body) => request('/leave-types', { method: 'POST', body, token }),
  updateLeaveType: (token, id, body) => request(`/leave-types/${id}`, { method: 'PUT', body, token }),
  deleteLeaveType: (token, id) => request(`/leave-types/${id}`, { method: 'DELETE', token }),

  getUsers: (token) => request('/users', { token }),
  createUser: (token, body) => request('/users', { method: 'POST', body, token }),
  updateUser: (token, id, body) => request(`/users/${id}`, { method: 'PUT', body, token }),
  getBalances: (token, userId) => request(`/users/${userId}/balances`, { token }),
  setBalance: (token, userId, body) => request(`/users/${userId}/balances`, { method: 'PUT', body, token }),

  getMyRequests: (token) => request('/requests/mine', { token }),
  createRequest: (token, body) => request('/requests', { method: 'POST', body, token }),
  getTeamRequests: (token) => request('/requests/team', { token }),
  decideRequest: (token, id, status) => request(`/requests/${id}/decide`, { method: 'PUT', body: { status }, token }),
  getCalendar: (token, start, end, department) =>
    request(`/requests/calendar?start=${start}&end=${end}${department ? `&department=${encodeURIComponent(department)}` : ''}`, { token }),

  getHolidays: (token, year) => request(`/holidays?year=${year}`, { token }),
  createHoliday: (token, body) => request('/holidays', { method: 'POST', body, token }),
  deleteHoliday: (token, id) => request(`/holidays/${id}`, { method: 'DELETE', token }),
};
