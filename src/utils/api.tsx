// utils/api.ts
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  console.log('Sending request with JWT token');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token mungkin expired
    localStorage.removeItem('authToken');
    throw new Error('Token expired or invalid');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};