import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  created_at?: string;
}

// Extended interface untuk data mentah dari API
interface RawUser {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  username?: string;
  role?: string;
  user_type?: string;
  userType?: string;
  created_at?: string;
  createdAt?: string;
}

// Helper function untuk extract data dari response API
const extractDataFromResponse = (response: any): any[] => {
  // Cek berbagai kemungkinan struktur response
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.data)) {
    return response.data;
  }
  if (response && response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  if (response && typeof response.data === 'object' && !Array.isArray(response.data)) {
    // Jika data adalah object tunggal, kembalikan sebagai array
    return [response.data];
  }
  // Fallback: return array kosong
  console.warn("Unable to extract array data from response:", response);
  return [];
};

// Helper function untuk validasi user
const isValidUser = (user: any): user is RawUser => {
  return (
    user &&
    typeof user === 'object' &&
    user.id &&
    typeof user.email === 'string'
  );
};

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = Cookies.get('token');
      
      console.log('Fetching users from:', `${API_URL}/users`);
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please login again');
        }
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Raw API response:', result);
      
      // Extract data dari response menggunakan helper function
      const userData = extractDataFromResponse(result);
      console.log('Extracted user data:', userData);

      if (!Array.isArray(userData)) {
        console.error('User data is not an array:', userData);
        throw new Error('Invalid user data format');
      }

      // Filter hanya users yang valid
      const validUsers = userData.filter(isValidUser);
      console.log('Valid users:', validUsers);

      if (validUsers.length === 0) {
        console.warn('No valid users found in response');
      }

      // Normalize user data dengan lebih banyak logging
      const normalizedUsers = validUsers.map(user => {
        // Prioritaskan role dari database, fallback ke user_type atau userType untuk kompatibilitas
        const userRole = (
          user.role || 
          user.user_type || 
          user.userType || 
          'SE' // Default value
        ).toString().toUpperCase().trim();

        const normalizedUser: User = {
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.name || user.username || user.email,
          role: userRole,
          created_at: user.created_at || user.createdAt || new Date().toISOString()
        };
        
        console.log('Normalized user:', {
          original: { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            user_type: user.user_type, 
            userType: user.userType
          },
          normalized: normalizedUser
        });
        
        return normalizedUser;
      });

      console.log('All normalized users:', normalizedUsers);
      setUsers(normalizedUsers);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Function untuk filter users by role
  const getUsersByRole = (role: string) => {
    const filterRole = role.toUpperCase().trim();
    return users.filter(user => 
      (user.role || '').toUpperCase().trim() === filterRole
    );
  };

  // Function untuk mencari user by ID
  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  // Function untuk mencari user by email
  const getUserByEmail = (email: string) => {
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  };

  // Function untuk mendapatkan semua unique roles
  const getUniqueRoles = () => {
    return Array.from(new Set(users.map(user => user.role).filter(Boolean))) as string[];
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { 
    users, 
    loading, 
    error,
    getUsersByRole,
    getUserById,
    getUserByEmail,
    getUniqueRoles,
    refetch: fetchUsers 
  };
};

// Alternative hook jika butuh dengan authentication context
export const useUsersWithAuth = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = Cookies.get('token');
      
      console.log('Fetching users from:', `${API_URL}/users`);
      
      if (!token) {
        console.warn('No token found, skipping users fetch');
        setUsers([]);
        return;
      }

      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please login again');
        }
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Raw API response:', result);
      
      const userData = extractDataFromResponse(result);
      console.log('Extracted user data:', userData);

      if (!Array.isArray(userData)) {
        console.error('User data is not an array:', userData);
        throw new Error('Invalid user data format');
      }

      const validUsers = userData.filter(isValidUser);
      console.log('Valid users:', validUsers);

      const normalizedUsers = validUsers.map(user => {
        const userRole = (
          user.role || 
          user.user_type || 
          user.userType || 
          'SE'
        ).toString().toUpperCase().trim();

        const normalizedUser: User = {
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.name || user.username || user.email,
          role: userRole,
          created_at: user.created_at || user.createdAt || new Date().toISOString()
        };

        return normalizedUser;
      });

      console.log('All normalized users:', normalizedUsers);
      setUsers(normalizedUsers);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Function untuk filter users by role
  const getUsersByRole = (role: string) => {
    const filterRole = role.toUpperCase().trim();
    return users.filter(user => 
      (user.role || '').toUpperCase().trim() === filterRole
    );
  };

  // Function untuk mendapatkan semua unique roles
  const getUniqueRoles = () => {
    return Array.from(new Set(users.map(user => user.role).filter(Boolean))) as string[];
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { 
    users, 
    loading, 
    error,
    getUsersByRole,
    getUniqueRoles,
    refetch: fetchUsers 
  };
};

// Hook khusus untuk development/debugging
export const useUsersDebug = () => {
  const { users, loading, error, refetch, getUniqueRoles } = useUsersWithAuth();

  // Log tambahan untuk debugging
  useEffect(() => {
    if (!loading) {
      console.log('=== USERS DEBUG INFO ===');
      console.log('Total users:', users.length);
      console.log('Loading:', loading);
      console.log('Error:', error);
      
      const roles = getUniqueRoles();
      console.log('Available roles:', roles);
      
      // Tampilkan distribusi per role
      roles.forEach(role => {
        const count = users.filter(user => user.role === role).length;
        console.log(`Role ${role}: ${count} users`);
      });
      
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`, {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          created_at: user.created_at
        });
      });
      console.log('=== END DEBUG INFO ===');
    }
  }, [users, loading, error, getUniqueRoles]);

  return { users, loading, error, refetch, getUniqueRoles };
};

export default useUsers;