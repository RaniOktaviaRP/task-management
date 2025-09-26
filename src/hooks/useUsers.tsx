import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = Cookies.get('token');
        console.log('Current token:', token); // Untuk debugging

        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Users fetch error:', errorData); // Untuk debugging
          throw new Error(errorData.message || 'Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data);
        setError(null);
      } catch (err) {
        console.error('Error in useUsers:', err); // Untuk debugging
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // Mungkin perlu menambahkan dependencies sesuai kebutuhan

  return { users, loading, error };
}