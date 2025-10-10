"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  profile?: any;
}

interface Session {
  token: string;
  expiresAt: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export class AuthService {
  private getToken(): string | undefined {
    return Cookies.get('token');
  }

  private getHeaders() {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async fetchUsers(): Promise<User[]> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${API_URL}/users`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    const result = await response.json();
    const users = result.data || result;
    return Array.isArray(users) ? users : [];
  }

  async fetchCurrentUser(token: string): Promise<User | null> {
    try {
      console.log('Fetching current user data...');
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Decoded token payload:', payload);
        
        const userId = payload.userId || payload.sub || payload.id;
        
        if (userId) {
          // Fetch user by ID
          console.log('Fetching user by ID:', userId);
          const userRes = await fetch(`${API_URL}/users/${userId}`, {
            headers: { 
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            console.log('User data by ID:', userData);
            
            // Fetch user profile
            const profileRes = await fetch(`${API_URL}/profiles/by-user/${userId}`, {
              headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
            });
            
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              console.log('Profile data:', profileData);
              
              const userWithProfile: User = {
                ...userData,
                full_name: profileData.full_name || userData.full_name || userData.name,
                role: profileData.role || userData.role || userData.user_type,
                profile: profileData
              };
              console.log('User with profile:', userWithProfile);
              return userWithProfile;
            }
            
            // Jika profile tidak ditemukan, tetap kembalikan user data
            return {
              ...userData,
              role: userData.role || userData.user_type
            };
          }
        }
      } catch (decodeError) {
        console.warn('Failed to decode token or fetch by ID:', decodeError);
      }

      // Option 2: Coba endpoint refresh untuk mendapatkan user data
      try {
        console.log('Trying refresh endpoint...');
        const refreshRes = await fetch(`${API_URL}/refresh`, {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          console.log('Refresh response:', refreshData);
          
          // Handle different response formats
          if (refreshData.data?.user) {
            return refreshData.data.user;
          } else if (refreshData.user) {
            return refreshData.user;
          } else if (refreshData.data) {
            return refreshData.data;
          }
        }
      } catch (refreshError) {
        console.warn('Refresh endpoint failed:', refreshError);
      }

      // Option 3: Get all users and find the current one (last resort)
      try {
        console.log('Trying to find user from all users list...');
        const allUsersRes = await fetch(`${API_URL}/users`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        if (allUsersRes.ok) {
          const allUsers = await allUsersRes.json();
          console.log('All users:', allUsers);
          
          // Jika hanya ada 1 user, mungkin itu yang sedang login
          if (Array.isArray(allUsers) && allUsers.length === 1) {
            console.log('Only one user found, assuming it is current user:', allUsers[0]);
            return allUsers[0];
          }
          
          // Coba cari berdasarkan decoded token info
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userEmail = payload.email;
            
            if (userEmail) {
              const currentUser = allUsers.find((u: any) => u.email === userEmail);
              if (currentUser) {
                console.log('Found user by email:', currentUser);
                return currentUser;
              }
            }
          } catch (e) {
            console.warn('Could not find user by email');
          }
        }
      } catch (allUsersError) {
        console.warn('All users endpoint failed:', allUsersError);
      }

      console.warn('Could not determine current user');
      return null;
    } catch (error) {
      console.error('Error in fetchCurrentUser:', error);
      return null;
    }
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const authService = new AuthService();

  // Fungsi untuk menyimpan token ke cookies
  const saveToken = (token: string) => {
    Cookies.set('token', token, {
      expires: 7, // Simpan token selama 7 hari
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  };
  
  // Fungsi untuk mengambil token dari cookies
  const getToken = () => {
    return Cookies.get('token');
  };
  
  // Fungsi untuk menghapus token dari cookies
  const removeToken = () => {
    Cookies.remove('token');
  };

  // Tambahkan fungsi untuk menyimpan user data di cookies
  const saveUserData = (userData: User) => {
    Cookies.set('user_data', JSON.stringify(userData), {
      expires: 7, // Simpan selama 7 hari
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  };

  // Dalam useEffect untuk auto-login
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = getToken();
        const savedUserData = Cookies.get('user_data');
        
        if (token && savedUserData) {
          // Parse user data dari cookies
          const userData: User = JSON.parse(savedUserData);
          setUser(userData);
          setSession({ 
            token, 
            expiresAt: Date.now() + (7 * 24 * 3600 * 1000) 
          });
        } else {
          // Jika tidak ada token atau user data, clear state
          setUser(null);
          setSession(null);
          removeToken();
          Cookies.remove('user_data');
        }
      } catch (error) {
        console.error("Error loading session", error);
        setUser(null);
        setSession(null);
        removeToken();
        Cookies.remove('user_data');
      } finally {
        setLoading(false);
      }
    };
  
    loadSession();
  }, []);

  // Fungsi untuk extract token dari berbagai kemungkinan struktur response
  const extractToken = (data: any): string | null => {
    // Cek berbagai kemungkinan struktur token dalam response
    const possibleTokenPaths = [
      'token',
      'access_token',
      'accessToken',
      'data.token',
      'data.access_token',
      'data.accessToken',
      'auth.token',
      'auth.access_token',
      'result.token',
      'result.access_token'
    ];

    for (const path of possibleTokenPaths) {
      const value = path.split('.').reduce((obj, key) => obj && obj[key], data);
      if (value && typeof value === 'string') {
        console.log(`Token found at path: ${path}`);
        return value;
      }
    }

    console.log('Token not found in response. Available keys:', Object.keys(data));
    return null;
  };

  // Fungsi untuk extract user data dari berbagai kemungkinan struktur response
  const extractUserData = (data: any): any => {
    const possibleUserPaths = [
      'user',
      'data.user',
      'data',
      'userData',
      'data.userData',
      'result.user',
      'result.data'
    ];

    for (const path of possibleUserPaths) {
      const value = path.split('.').reduce((obj, key) => obj && obj[key], data);
      if (value && typeof value === 'object') {
        console.log(`User data found at path: ${path}`);
        return value;
      }
    }

    console.log('User data not found in response structure');
    return null;
  };
  
  // Dalam fungsi signIn, setelah mendapatkan userData
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      console.log('Signing in with:', email);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      // Login request
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      console.log('Login response:', data);

      // Cek token di berbagai kemungkinan struktur data
      const token = data.data?.token || data.data?.access_token || data.token || data.access_token;
      if (!token) {
        throw new Error("Token not found in response");
      }

      // Simpan token
      saveToken(token);

      // Ambil data user dari response login dengan berbagai kemungkinan struktur
      let userData = data.data?.user || data.user;
      
      // Jika tidak ada userData di response login, coba ambil dari token
      if (!userData && token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.user_id) {
              // Gunakan user ID dari token untuk mengambil data user
              const userRes = await fetch(`${API_URL}/users/${payload.user_id}`, {
                headers: { 
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
              });
              
              if (userRes.ok) {
                const userResponse = await userRes.json();
                userData = userResponse.data || userResponse;
              }
            }
          }
        } catch (error) {
          console.warn('Failed to get user data from token:', error);
        }
      }

      // If no userData from login response, try to create minimal user data from token
      if (!userData || !userData.id) {
        console.warn('No user data in login response, attempting to create from token...');
        
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Token payload:', payload);
            
            // Create minimal user data from token
            userData = {
              id: payload.user_id || payload.sub || payload.id || 'unknown',
              email: payload.email || email,
              full_name: payload.full_name || payload.name || '',
              role: payload.role || payload.user_type || 'SE'
            };
            
            console.log('Created user data from token:', userData);
          }
        } catch (tokenError) {
          console.error('Failed to extract user data from token:', tokenError);
        }
        
        // If still no valid user data, create a minimal one
        if (!userData || !userData.id) {
          console.warn('Creating minimal user data...');
          userData = {
            id: 'temp_' + Date.now(),
            email: email,
            full_name: '',
            role: 'SE'
          };
        }
      }

      // Ambil profile data menggunakan user ID yang valid
      let completeUserData = { ...userData };
      
      // Only try to fetch profile if we have a valid user ID (not temp)
      if (userData.id && !userData.id.startsWith('temp_')) {
        try {
          const profileRes = await fetch(`${API_URL}/profiles/by-user/${userData.id}`, {
            headers: { 
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          });

          if (profileRes.ok) {
            const profileResponse = await profileRes.json();
            const profileData = profileResponse.data || profileResponse;
            
            if (profileData && profileData.full_name) {
              completeUserData = {
                ...userData,
                full_name: profileData.full_name,
                profile: profileData
              };
            } else {
              // Jika tidak ada full_name di profile, gunakan dari user data
              completeUserData = {
                ...userData,
                full_name: userData.full_name || "",
                profile: profileData
              };
            }
          } else {
            console.warn('Profile fetch failed with status:', profileRes.status);
            // Gunakan full_name dari user data
            completeUserData.full_name = userData.full_name || "";
            completeUserData.profile = null;
          }
        } catch (error) {
          console.warn('Failed to fetch profile:', error);
          completeUserData.full_name = userData.full_name || "";
          completeUserData.profile = null;
        }
      } else {
        console.warn('Skipping profile fetch for temporary user ID');
        completeUserData.profile = null;
      }

      // Simpan data lengkap di cookies
      Cookies.set('user_data', JSON.stringify(completeUserData), {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      // Update state
      setUser(completeUserData);
      setSession({
        token,
        expiresAt: Date.now() + (7 * 24 * 3600 * 1000)
      });

      console.log('Login successful with complete data:', completeUserData);

    } catch (error: any) {
      console.error("Sign in error:", error);
      removeToken();
      Cookies.remove('user_data');
      setUser(null);
      setSession(null);
      throw new Error(error.message || "An error occurred during sign in");
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      // Call logout endpoint jika token ada
      const token = getToken();
      if (token) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        await fetch(`${API_URL}/logout`, {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }).catch(error => {
          console.warn('Logout endpoint may not be available:', error);
        });
      }
    } catch (error) {
      console.error('Logout endpoint error:', error);
    } finally {
      setUser(null);
      setSession(null);
      removeToken();
      Cookies.remove('user_data'); // Hapus user data dari cookies
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthService;