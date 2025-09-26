"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = getToken();
        if (token) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/users`, {
            headers: { 
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data);
            setSession({ token, expiresAt: Date.now() + (7 * 24 * 3600 * 1000) });
          } else {
            setUser(null);
            setSession(null);
            removeToken();
          }
        }
      } catch (error) {
        console.error("Error loading session", error);
        removeToken();
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('Login response:', data);
      
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      const token = data.data?.token || data.token;
      console.log('Token from response:', token);

      if (!token) {
        throw new Error("Token not found in response");
      }

      // Simpan token
      saveToken(token);
      
      // Set session dengan token yang baru
      const newSession = { token, expiresAt: Date.now() + (7 * 24 * 3600 * 1000) };
      setSession(newSession);
      console.log('Session set with token:', newSession);

      // Fetch user data dengan token yang baru
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/users`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      console.log('User fetch response status:', userRes.status);

      if (!userRes.ok) {
        const errorData = await userRes.json();
        console.error('User fetch error details:', {
          status: userRes.status,
          statusText: userRes.statusText,
          errorData
        });
        throw new Error(errorData.message || "Failed to fetch user data");
      }

      const userData = await userRes.json();
      console.log('User data fetched:', userData);
      setUser(userData);
    } catch (error: any) {
      console.error("Sign in error:", error);
      removeToken();
      setUser(null);
      setSession(null);
      throw new Error(error.message || "An error occurred during sign in");
    }
  };

  const signOut = () => {
    setUser(null);
    setSession(null);
    removeToken();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};