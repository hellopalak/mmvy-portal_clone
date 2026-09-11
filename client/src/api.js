const apiBaseUrl = import.meta.env.VITE_API_URL || '';

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
  } catch {
    throw new Error('API server is not running. Start it with: npm run server:dev');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to complete the request.');
  return data;
}

export const getProfile = (userId, endpoint = '/api/users/') =>
  api(`${endpoint}${encodeURIComponent(userId)}`);
