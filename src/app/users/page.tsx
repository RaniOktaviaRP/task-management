'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Users, Eye, CheckCircle, Clock, CircleDot } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Layout from "@/components/Layout";

// Define types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'SE' | 'SCE';
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
  projectName?: string;
  effort: number;
  priority: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  user_id: string;
  tasks: Task[];
}

const UserManagement = () => {
  const { user: currentUser, session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'SE' as 'SE' | 'SCE'
  });
  const { toast } = useToast();

  // API base URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!session?.token) {
          throw new Error("Unauthorized: Please login first");
        }

        const headers = {
          "Authorization": `Bearer ${session.token}`,
          "Content-Type": "application/json"
        };

        const usersResponse = await fetch(`${API_URL}/users`, { headers });

        if (usersResponse.status === 401) {
          throw new Error("Session expired. Please login again.");
        }

        if (!usersResponse.ok) {
          // Coba parsing error message jika ada
          let errorMessage = "Failed to fetch users";
          try {
            const errorData = await usersResponse.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Jika response bukan JSON, gunakan status text
            errorMessage = usersResponse.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const usersData = await usersResponse.json();
        
        // Pastikan usersData adalah array
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        } else if (usersData && typeof usersData === 'object') {
          // Jika response adalah object, coba ekstrak array users darinya
          if (Array.isArray(usersData.users)) {
            setUsers(usersData.users);
          } else if (Array.isArray(usersData.data)) {
            setUsers(usersData.data);
          } else {
            // Jika tidak ada array yang ditemukan, set ke array kosong
            console.warn('Users data is not an array:', usersData);
            setUsers([]);
          }
        } else {
          // Jika format tidak dikenali, set ke array kosong
          console.warn('Unexpected users data format:', usersData);
          setUsers([]);
        }
      } catch (error: any) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load users data",
          variant: "destructive"
        });
        // Pastikan users tetap array kosong jika terjadi error
        setUsers([]);
      }
    };

    // Fetch projects separately - don't let projects failure affect users
    const fetchProjects = async () => {
      try {
        if (!session?.token) return;

        const headers = {
          "Authorization": `Bearer ${session.token}`,
          "Content-Type": "application/json"
        };

        const projectsResponse = await fetch(`${API_URL}/projects`, { headers });

        // Jika projects gagal, kita tidak throw error karena mungkin belum ada projects
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          
          // Pastikan projectsData adalah array
          if (Array.isArray(projectsData)) {
            setProjects(projectsData);
          } else if (projectsData && typeof projectsData === 'object') {
            // Jika response adalah object, coba ekstrak array projects darinya
            if (Array.isArray(projectsData.projects)) {
              setProjects(projectsData.projects);
            } else if (Array.isArray(projectsData.data)) {
              setProjects(projectsData.data);
            } else {
              // Jika tidak ada array yang ditemukan, set ke array kosong
              console.warn('Projects data is not an array:', projectsData);
              setProjects([]);
            }
          } else {
            // Jika format tidak dikenali, set ke array kosong
            console.warn('Unexpected projects data format:', projectsData);
            setProjects([]);
          }
        }
        // Jika tidak ok, kita abaikan saja karena mungkin belum ada projects
      } catch (error) {
        console.error('Error fetching projects:', error);
        // Kita tidak menampilkan toast error untuk projects karena mungkin belum ada
        setProjects([]);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        // Jalankan kedua fetch secara parallel tetapi terpisah error handling-nya
        await Promise.allSettled([
          fetchUsers(),
          fetchProjects()
        ]);
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [session?.token, API_URL, toast]);

  // Fetch current user profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (currentUser && session?.token) {
        try {
          const response = await fetch(`${API_URL}/profiles/by-user${currentUser.id}`, {
            headers: {
              "Authorization": `Bearer ${session.token}`,
              "Content-Type": "application/json"
            }
          });
          
          if (response.status === 401) {
            throw new Error("Session expired. Please login again.");
          }
          
          if (response.ok) {
            const data = await response.json();
            setCurrentUserProfile(data);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Jangan tampilkan error toast untuk profile karena tidak critical
        }
      }
    };

    fetchCurrentUserProfile();
  }, [currentUser, session?.token, API_URL]);

  // Calculate new users this week - pastikan users adalah array
  const newUsersThisWeek = Array.isArray(users) ? users.filter(user => {
    try {
      const createdDate = new Date(user.created_at);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return createdDate >= oneWeekAgo;
    } catch (e) {
      console.error('Error parsing date for user:', user, e);
      return false;
    }
  }).length : 0;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (!session?.token) {
        throw new Error("Unauthorized: Please login first");
      }

      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required');
      }
      
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const newUser = await response.json();

      toast({
        title: "Success",
        description: `${formData.full_name || formData.email} has been added to the system.`
      });

      // Refresh users list
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Pastikan data yang diset adalah array
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        } else if (usersData && Array.isArray(usersData.users)) {
          setUsers(usersData.users);
        } else if (usersData && Array.isArray(usersData.data)) {
          setUsers(usersData.data);
        } else {
          setUsers([]);
        }
      }

      setShowAddDialog(false);
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: 'SE'
      });
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive"
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormLoading(true);
    try {
      // Validate email format
      if (!formData.email || !formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (!session?.token) {
        throw new Error("Unauthorized: Please login first");
      }

      const response = await fetch(`${API_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role
        }),
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      toast({
        title: "User updated successfully",
        description: `${formData.full_name || formData.email} has been updated.`
      });

      // Refresh users list
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Pastikan data yang diset adalah array
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        } else if (usersData && Array.isArray(usersData.users)) {
          setUsers(usersData.users);
        } else if (usersData && Array.isArray(usersData.data)) {
          setUsers(usersData.data);
        } else {
          setUsers([]);
        }
      }
      
      // Reset form and close editing mode
      setEditingUser(null);
      setFormData({ email: '', full_name: '', password: '', role: 'SE' });
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error updating user",
        description: error.message || 'Failed to update user information',
        variant: "destructive"
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setFormLoading(true);
    try {
      if (!session?.token) {
        throw new Error("Unauthorized: Please login first");
      }

      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      toast({
        title: "User deleted successfully",
        description: "The user has been removed from the system."
      });

      // Refresh users list
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Pastikan data yang diset adalah array
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        } else if (usersData && Array.isArray(usersData.users)) {
          setUsers(usersData.users);
        } else if (usersData && Array.isArray(usersData.data)) {
          setUsers(usersData.data);
        } else {
          setUsers([]);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFormLoading(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      role: user.role || 'SE'
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'SE'
    });
  };

  const handleViewTasks = (userId: string) => {
    setSelectedUserId(userId);
    setShowTasksDialog(true);
  };

  const getUserProjects = (userId: string) => {
    return Array.isArray(projects) ? projects.filter(project => project.user_id === userId) : [];
  };

  const getUserTasks = (userId: string) => {
    const userProjects = getUserProjects(userId);
    return userProjects.flatMap(project => 
      Array.isArray(project.tasks) ? project.tasks.map(task => ({
        ...task,
        projectName: project.name
      })) : []
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <CircleDot className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Layout>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading users...</div>
      </div>
      </Layout>
    );
  }

  return (
        <Layout>
      <div className="min-h-screen w-full bg-gradient-subtle text-foreground">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <Users className="w-8 h-8" />
                  User Management
                </h1>
                <p className="text-lg text-muted-foreground">
                  Manage system users and their information
                </p>
              </div>
              
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 bg-gradient-primary text-primary-foreground shadow-card hover:shadow-glow transition-all">
                    <Plus className="w-4 h-4" />
                    Add New User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New User</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Create a new user account in the system.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-email" className="text-foreground">Email</Label>
                      <Input 
                        id="add-email" 
                        type="email" 
                        placeholder="Enter email address" 
                        value={formData.email} 
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} 
                        required 
                        className="bg-input border-border text-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-name" className="text-foreground">Full Name</Label>
                      <Input 
                        id="add-name" 
                        type="text" 
                        placeholder="Enter full name" 
                        value={formData.full_name} 
                        onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))} 
                        className="bg-input border-border text-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-usertype" className="text-foreground">User Type</Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(value: 'SE' | 'SCE') => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SE">Software Engineering (SE)</SelectItem>
                          <SelectItem value="SCE">Software Computer Engineering (SCE)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-password" className="text-foreground">Password</Label>
                      <Input 
                        id="add-password" 
                        type="password" 
                        placeholder="Enter password" 
                        value={formData.password} 
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))} 
                        required 
                        minLength={6} 
                        className="bg-input border-border text-foreground" 
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={formLoading} className="flex-1 bg-gradient-primary text-primary-foreground">
                        {formLoading ? "Adding..." : "Add User"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-2xl p-6 bg-card border border-border shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">{Array.isArray(users) ? users.length : 0}</p>
                  </div>
                  <div className="text-primary">
                    <Users className="w-8 h-8" />
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl p-6 bg-card border border-border shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Sessions</p>
                    <p className="text-2xl font-bold text-foreground">{currentUser ? 1 : 0}</p>
                  </div>
                  <div className="text-success">
                    <Users className="w-8 h-8" />
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl p-6 bg-card border border-border shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">New This Week</p>
                    <p className="text-2xl font-bold text-foreground">{newUsersThisWeek}</p>
                  </div>
                  <div className="text-accent">
                    <Plus className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Users List */}
          <div className="space-y-4">
            {Array.isArray(users) && users.map(user => (
              <Card key={user.id} className="bg-card border border-border shadow-card">
                <CardContent className="p-6">
                  {editingUser?.id === user.id ? (
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-email" className="text-foreground">Email</Label>
                          <Input 
                            id="edit-email" 
                            type="email" 
                            value={formData.email} 
                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} 
                            required 
                            className="bg-input border-border text-foreground" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-name" className="text-foreground">Full Name</Label>
                          <Input 
                            id="edit-name" 
                            type="text" 
                            value={formData.full_name} 
                            onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))} 
                            className="bg-input border-border text-foreground" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-usertype" className="text-foreground">User Type</Label>
                        <Select 
                          value={formData.role} 
                          onValueChange={(value: 'SE' | 'SCE') => setFormData(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger className="bg-input border-border text-foreground">
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SE">Software Engineering (SE)</SelectItem>
                            <SelectItem value="SCE">Software Computer Engineering (SCE)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={formLoading} size="sm">
                          {formLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {user.full_name || 'No name set'}
                          <Badge className="ml-2" variant={user.role === 'SE' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </h3>
                        <p className="text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewTasks(user.id)} className="border-border text-foreground hover:bg-muted">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => startEdit(user)} className="border-border text-foreground hover:bg-muted">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)} disabled={user.id === currentUser?.id}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {(!Array.isArray(users) || users.length === 0) && (
              <Card className="bg-card border border-border shadow-card">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No users found</h3>
                  <p className="text-muted-foreground mb-6">Get started by adding your first user to the system.</p>
                  <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First User
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tasks Dialog */}
          <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
            <DialogContent className="bg-card border border-border max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">User Tasks</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Tasks assigned to {selectedUserId ? users.find(u => u.id === selectedUserId)?.full_name || users.find(u => u.id === selectedUserId)?.email : 'this user'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedUserId && (() => {
                  const userTasks = getUserTasks(selectedUserId);
                  const userProjects = getUserProjects(selectedUserId);
                  
                  return (
                    <div className="space-y-6">
                      {/* Project Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg p-4 bg-muted border border-border">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Projects</p>
                            <p className="text-2xl font-bold text-foreground">{userProjects.length}</p>
                          </div>
                        </div>
                        <div className="rounded-lg p-4 bg-muted border border-border">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Tasks</p>
                            <p className="text-2xl font-bold text-foreground">{userTasks.length}</p>
                          </div>
                        </div>
                        <div className="rounded-lg p-4 bg-muted border border-border">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold text-foreground">
                              {userTasks.filter(task => task.status === 'completed').length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tasks List */}
                      {userTasks.length > 0 ? (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-foreground">Tasks</h3>
                          {userTasks.map(task => (
                            <Card key={task.id} className="bg-card border border-border">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {getStatusIcon(task.status)}
                                      <h4 className="font-medium text-foreground">{task.title}</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      Project: {task.projectName}
                                    </p>
                                    <div className="flex items-center gap-3">
                                      <Badge className={getPriorityColor(task.priority)}>
                                        {task.priority}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        Effort: {task.effort}h
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        Status: {task.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
                          <p className="text-muted-foreground">This user has no tasks assigned yet.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
};

export default UserManagement;