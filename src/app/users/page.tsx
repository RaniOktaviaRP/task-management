"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Eye,
  CheckCircle,
  Clock,
  CircleDot,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Layout from "@/components/Layout";

// Define types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: "SE" | "SCE";
  created_at?: string; // Make optional since API sometimes doesn't return this
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "SE" as "SE" | "SCE",
  });
  const { toast } = useToast();

  // Helper function to format dates safely
  const formatDate = (dateString: string | undefined | null) => {
    try {
      // Check if dateString is valid
      if (
        !dateString ||
        dateString === "" ||
        dateString === "null" ||
        dateString === "undefined" ||
        dateString === undefined ||
        dateString === null
      ) {
        return "No Date";
      }

      // Try to parse the date
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "Invalid Date";
      }

      // Check if the date is reasonable (not too far in past/future)
      const currentYear = new Date().getFullYear();
      const dateYear = date.getFullYear();

      if (dateYear < 2000 || dateYear > currentYear + 10) {
        console.warn(
          "Date seems unreasonable:",
          dateString,
          "parsed as:",
          date
        );
        return "Invalid Date";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Invalid Date";
    }
  };

  // API base URL
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  // Helper functions
  const isCurrentUserSE = () => {
    return currentUserProfile?.role === "SE" || currentUser?.role === "SE";
  };

  const canEditUserRole = (targetUser: User) => {
    // Only SE can edit user roles
    // SE can edit both SE and SCE
    // SCE cannot edit roles at all
    return isCurrentUserSE();
  };

  const canEditUserProfile = (targetUser: User) => {
    // Users can always edit their own profile
    // SE can edit anyone's profile
    return targetUser.id === currentUser?.id || isCurrentUserSE();
  };

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(
      (user) =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // SE users come first, then SCE users
      if (a.role === "SE" && b.role === "SCE") return -1;
      if (a.role === "SCE" && b.role === "SE") return 1;
      // If same role, sort alphabetically by name
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!session?.token) {
          throw new Error("Unauthorized: Please login first");
        }

        const headers = {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
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
        } else if (usersData && typeof usersData === "object") {
          // Jika response adalah object, coba ekstrak array users darinya
          if (Array.isArray(usersData.users)) {
            setUsers(usersData.users);
          } else if (Array.isArray(usersData.data)) {
            setUsers(usersData.data);
          } else {
            // Jika tidak ada array yang ditemukan, set ke array kosong
            console.warn("Users data is not an array:", usersData);
            setUsers([]);
          }
        } else {
          // Jika format tidak dikenali, set ke array kosong
          console.warn("Unexpected users data format:", usersData);
          setUsers([]);
        }
      } catch (error: any) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load users data",
          variant: "destructive",
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
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        };

        const projectsResponse = await fetch(`${API_URL}/projects`, {
          headers,
        });

        // Jika projects gagal, kita tidak throw error karena mungkin belum ada projects
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();

          // Pastikan projectsData adalah array
          if (Array.isArray(projectsData)) {
            setProjects(projectsData);
          } else if (projectsData && typeof projectsData === "object") {
            // Jika response adalah object, coba ekstrak array projects darinya
            if (Array.isArray(projectsData.projects)) {
              setProjects(projectsData.projects);
            } else if (Array.isArray(projectsData.data)) {
              setProjects(projectsData.data);
            } else {
              // Jika tidak ada array yang ditemukan, set ke array kosong
              console.warn("Projects data is not an array:", projectsData);
              setProjects([]);
            }
          } else {
            // Jika format tidak dikenali, set ke array kosong
            console.warn("Unexpected projects data format:", projectsData);
            setProjects([]);
          }
        }
        // Jika tidak ok, kita abaikan saja karena mungkin belum ada projects
      } catch (error) {
        console.error("Error fetching projects:", error);
        // Kita tidak menampilkan toast error untuk projects karena mungkin belum ada
        setProjects([]);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        // Jalankan kedua fetch secara parallel tetapi terpisah error handling-nya
        await Promise.allSettled([fetchUsers(), fetchProjects()]);
      } catch (error) {
        console.error("Error in fetchData:", error);
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
      if (currentUser?.id && session?.token) {
        try {
          const response = await fetch(
            `${API_URL}/profiles/by-user/${currentUser.id}`,
            {
              headers: {
                Authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.status === 401) {
            throw new Error("Session expired. Please login again.");
          }

          if (response.ok) {
            const data = await response.json();
            setCurrentUserProfile(data);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Jangan tampilkan error toast untuk profile karena tidak critical
        }
      }
    };

    fetchCurrentUserProfile();
  }, [currentUser, session?.token, API_URL]);

  // Calculate new users this week - pastikan users adalah array
  const newUsersThisWeek = Array.isArray(users)
    ? users.filter((user) => {
        try {
          const createdDate = new Date(user.created_at);
          // Check if date is valid
          if (isNaN(createdDate.getTime())) {
            return false;
          }
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return createdDate >= oneWeekAgo;
        } catch (e) {
          console.error("Error parsing date for user:", user, e);
          return false;
        }
      }).length
    : 0;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (!session?.token) {
        throw new Error("Unauthorized: Please login first");
      }

      if (!formData.email || !formData.password) {
        throw new Error("Email and password are required");
      }

      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      const newUser = await response.json();

      toast({
        title: "Success",
        description: `${
          formData.full_name || formData.email
        } has been added to the system.`,
      });

      // Refresh users list
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
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
        email: "",
        full_name: "",
        password: "",
        role: "SE",
      });
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
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
      if (!formData.email || !formData.email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      if (!session?.token) {
        throw new Error("Unauthorized: Please login first");
      }

      const response = await fetch(`${API_URL}/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
        }),
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }

      toast({
        title: "User updated successfully",
        description: `${
          formData.full_name || formData.email
        } has been updated.`,
      });

      // Refresh users list
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
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
      setFormData({ email: "", full_name: "", password: "", role: "SE" });
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error updating user",
        description: error.message || "Failed to update user information",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setFormLoading(true);
    try {
      if (!session?.token) {
        throw new Error("Unauthorized: Please login first");
      }

      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }

      toast({
        title: "User deleted successfully",
        description: "The user has been removed from the system.",
      });

      // Refresh users list
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
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
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setUserToDelete(null);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || "",
      password: "",
      role: user.role || "SE",
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      full_name: "",
      password: "",
      role: "SE",
    });
  };

  const handleViewTasks = (userId: string) => {
    setSelectedUserId(userId);
    setShowTasksDialog(true);
  };

  const getUserProjects = (userId: string) => {
    return Array.isArray(projects)
      ? projects.filter((project) => project.user_id === userId)
      : [];
  };

  const getUserTasks = (userId: string) => {
    const userProjects = getUserProjects(userId);
    return userProjects.flatMap((project) =>
      Array.isArray(project.tasks)
        ? project.tasks.map((task) => ({
            ...task,
            projectName: project.name,
          }))
        : []
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <CircleDot className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

              {isCurrentUserSE() && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 bg-gradient-primary text-primary-foreground shadow-card hover:shadow-glow transition-all">
                      <Plus className="w-4 h-4" />
                      Add New User
                    </Button>
                  </DialogTrigger>
                <DialogContent className="bg-card border border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">
                      Add New User
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Create a new user account in the system.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-email" className="text-foreground">
                        Email
                      </Label>
                      <Input
                        id="add-email"
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        required
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-name" className="text-foreground">
                        Full Name
                      </Label>
                      <Input
                        id="add-name"
                        type="text"
                        placeholder="Enter full name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-usertype" className="text-foreground">
                        User Type
                      </Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: "SE" | "SCE") =>
                          setFormData((prev) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SE">
                            Software Engineering (SE)
                          </SelectItem>
                          <SelectItem value="SCE">
                            Software Computer Engineering (SCE)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-password" className="text-foreground">
                        Password
                      </Label>
                      <Input
                        id="add-password"
                        type="password"
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        required
                        minLength={6}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={formLoading}
                        className="flex-1 bg-gradient-primary text-primary-foreground"
                      >
                        {formLoading ? "Adding..." : "Add User"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddDialog(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-2xl p-6 bg-card border border-border shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Array.isArray(users) ? users.length : 0}
                    </p>
                  </div>
                  <div className="text-primary">
                    <Users className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 bg-card border border-border shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Sessions
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {currentUser ? 1 : 0}
                    </p>
                  </div>
                  <div className="text-success">
                    <Users className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 bg-card border border-border shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      New This Week
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {newUsersThisWeek}
                    </p>
                  </div>
                  <div className="text-accent">
                    <Plus className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
              </div>
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Found {filteredAndSortedUsers.length} user(s) matching "
                {searchQuery}"
              </p>
            )}
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {/* Role Priority Info */}
            {filteredAndSortedUsers.length > 0 && (
              <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">Role Hierarchy:</p>
                <p>
                  •{" "}
                  <span className="text-blue-600 font-semibold">
                    SE (Sarana Engineer)
                  </span>{" "}
                  - Senior role
                </p>
                <p>
                  •{" "}
                  <span className="text-gray-600">
                    SCE (Sarana Camp Engineer)
                  </span>{" "}
                  - Junior role
                </p>
              </div>
            )}

            {Array.isArray(filteredAndSortedUsers) &&
              filteredAndSortedUsers.map((user) => (
                <Card
                  key={user.id}
                  className="bg-card border border-border shadow-card"
                >
                  <CardContent className="p-6">
                    {editingUser?.id === user.id ? (
                      <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="edit-email"
                              className="text-foreground"
                            >
                              Email
                            </Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={formData.email}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              required
                              className="bg-input border-border text-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="edit-name"
                              className="text-foreground"
                            >
                              Full Name
                            </Label>
                            <Input
                              id="edit-name"
                              type="text"
                              value={formData.full_name}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  full_name: e.target.value,
                                }))
                              }
                              className="bg-input border-border text-foreground"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="edit-usertype"
                            className="text-foreground"
                          >
                            User Type
                          </Label>
                          {canEditUserRole(user) ? (
                            <Select
                              value={formData.role}
                              onValueChange={(value: "SE" | "SCE") =>
                                setFormData((prev) => ({
                                  ...prev,
                                  role: value,
                                }))
                              }
                            >
                              <SelectTrigger className="bg-input border-border text-foreground">
                                <SelectValue placeholder="Select user type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SE">
                                  Software Engineering (SE)
                                </SelectItem>
                                <SelectItem value="SCE">
                                  Software Computer Engineering (SCE)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : user.id === currentUser?.id ? (
                            // SCE user editing their own profile - show disabled field
                            <div className="p-3 bg-muted/50 rounded-md border">
                              <Badge
                                variant={
                                  formData.role === "SE"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {formData.role === "SE"
                                  ? "Software Engineering (SE)"
                                  : "Software Computer Engineering (SCE)"}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                You cannot change your own user type
                              </p>
                            </div>
                          ) : (
                            // Non-SE user trying to edit someone else
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm text-muted-foreground">
                                Only SE users can change user types
                              </p>
                              <Badge
                                className="mt-2"
                                variant={
                                  formData.role === "SE"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {formData.role === "SE"
                                  ? "Software Engineering (SE)"
                                  : "Software Computer Engineering (SCE)"}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            disabled={formLoading}
                            size="sm"
                            variant="default"
                          >
                            {formLoading ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {user.full_name || "No name set"}
                            <Badge
                              className={`ml-2 ${
                                user.role === "SE"
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-gray-500 text-white border-gray-500"
                              }`}
                            >
                              {user.role === "SE" ? "SE" : "SCE"}
                            </Badge>
                          </h3>
                          <p className="text-muted-foreground">{user.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Created: {formatDate(user.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTasks(user.id)}
                            className="border-border text-foreground hover:bg-muted"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isCurrentUserSE() && canEditUserProfile(user) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(user)}
                              className="border-border text-foreground hover:bg-muted"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {isCurrentUserSE() && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => confirmDeleteUser(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No users found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Get started by adding your first user to the system.
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-primary text-primary-foreground"
                  >
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
                <DialogTitle className="text-foreground">
                  User Tasks
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Tasks assigned to{" "}
                  {selectedUserId
                    ? users.find((u) => u.id === selectedUserId)?.full_name ||
                      users.find((u) => u.id === selectedUserId)?.email
                    : "this user"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedUserId &&
                  (() => {
                    const userTasks = getUserTasks(selectedUserId);
                    const userProjects = getUserProjects(selectedUserId);

                    return (
                      <div className="space-y-6">
                        {/* Project Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="rounded-lg p-4 bg-muted border border-border">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">
                                Projects
                              </p>
                              <p className="text-2xl font-bold text-foreground">
                                {userProjects.length}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-lg p-4 bg-muted border border-border">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">
                                Total Tasks
                              </p>
                              <p className="text-2xl font-bold text-foreground">
                                {userTasks.length}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-lg p-4 bg-muted border border-border">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">
                                Completed
                              </p>
                              <p className="text-2xl font-bold text-foreground">
                                {
                                  userTasks.filter(
                                    (task) => task.status === "completed"
                                  ).length
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tasks List */}
                        {userTasks.length > 0 ? (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground">
                              Tasks
                            </h3>
                            {userTasks.map((task) => (
                              <Card
                                key={task.id}
                                className="bg-card border border-border"
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        {getStatusIcon(task.status)}
                                        <h4 className="font-medium text-foreground">
                                          {task.title}
                                        </h4>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">
                                        Project: {task.projectName}
                                      </p>
                                      <div className="flex items-center gap-3">
                                        <Badge
                                          className={getPriorityColor(
                                            task.priority
                                          )}
                                        >
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
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No tasks found
                            </h3>
                            <p className="text-muted-foreground">
                              This user has no tasks assigned yet.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="bg-card border border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Delete User
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Are you sure you want to delete this user? This action cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              {userToDelete && (
                <div className="py-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-foreground">
                      {userToDelete.full_name || "No name set"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {userToDelete.email}
                    </p>
                    <Badge
                      className={`mt-2 ${
                        userToDelete.role === "SE"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-500 text-white border-gray-500"
                      }`}
                    >
                      {userToDelete.role === "SE" ? "SE" : "SCE"}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="destructive"
                  onClick={() =>
                    userToDelete && handleDeleteUser(userToDelete.id)
                  }
                  disabled={formLoading}
                  className="flex-1"
                >
                  {formLoading ? "Deleting..." : "Yes, Delete"}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelDelete}
                  disabled={formLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
};

export default UserManagement;
