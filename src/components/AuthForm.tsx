'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Cookies from 'js-cookie';

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Function to get headers with authorization
const getHeaders = (includeAuth: boolean = false): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };
  
  if (includeAuth) {
    const token = Cookies.get('token');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

const AuthForm = ({ onAuthSuccess }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'SE' | 'SCE'>('SE');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const token = Cookies.get('token');
    if (token) {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) return;

      // Verify token by fetching current user profile
      const response = await fetch(`${API_BASE_URL}/users/current`, {
        headers: getHeaders(true)
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      } else {
        // Token invalid, clear it
        Cookies.remove('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('token');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role: role
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 || data.message?.includes('already exists')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.message || 'Registration failed');
        }
      } else {
        toast({
          title: "Registration successful",
          description: "Your account has been created. Please sign in.",
        });
        // Switch to sign in tab after successful registration
        const tabsList = document.querySelector('[data-value="signin"]') as HTMLElement;
        if (tabsList) {
          tabsList.click();
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email,
          password
        })
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Login failed",
            description: "Invalid email or password. Please check your credentials.",
            variant: "destructive",
          });
        } else {
          throw new Error(data as any || 'Login failed');
        }
      } else {
        // Store token in cookies
        Cookies.set('token', data.token, { expires: 7 }); // Expires in 7 days
        
        // Store user data
        setUser(data.user);

        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in.",
        });

        // Create or update user profile
        await ensureUserProfile(data.user.id, data.token);

        if (onAuthSuccess) {
          onAuthSuccess();
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "An error occurred during sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const ensureUserProfile = async (userId: string, token: string) => {
    try {
      // Check if profile exists
      const profileResponse = await fetch(`${API_BASE_URL}/profiles/by-user/${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (profileResponse.status === 404) {
        // Profile doesn't exist, create one
        await fetch(`${API_BASE_URL}/profiles`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: userId,
            full_name: fullName || user?.full_name || email.split('@')[0],
            role: role
          })
        });
      }
    } catch (error) {
      console.error('Failed to ensure user profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: getHeaders(true)
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      Cookies.remove('token');
      setUser(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    }
  };

  // If user is already logged in, show welcome message
  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome Back!</CardTitle>
          <CardDescription className="text-center">
            You are already signed in as {user.full_name || user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Role: {user.role}
            </p>
            <p className="text-sm text-muted-foreground">
              Email: {user.email}
            </p>
          </div>
          <Button onClick={handleLogout} className="w-full" variant="outline">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Welcome</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-fullname">Full Name</Label>
                <Input
                  id="signup-fullname"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-role">Role</Label>
                <Select value={role} onValueChange={(value: 'SE' | 'SCE') => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SE">Sarana Engineer (SE)</SelectItem>
                    <SelectItem value="SCE">Sarana Camp Engineer (SCE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AuthForm;