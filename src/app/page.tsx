"use client";
import { useState, useEffect } from "react";
import {
  Sun,
  Flame,
  Clock3,
  Calendar,
  AlertTriangle,
  Users,
  CalendarDays,
} from "lucide-react";
import { TaskCard, type Task } from "@/components/TaskCard";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { CapacityBar } from "@/components/CapacityBar";
import { QuickAdd } from "@/components/QuickAdd";
import { PendingTasks } from "@/components/PendingTasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Cookies from "js-cookie";
import { TaskGroups } from "@/components/TaskGroups";

// Types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  user_id: string;
  tasks: Task[];
}

// Helper function untuk extract data dari response API
const extractDataFromResponse = (response: any): any[] => {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.data)) {
    return response.data;
  }
  if (response && response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  if (
    response &&
    typeof response.data === "object" &&
    !Array.isArray(response.data)
  ) {
    return [response.data];
  }
  console.warn("Unable to extract array data from response:", response);
  return [];
};

// Helper function untuk validasi user
const isValidUser = (user: any): user is User => {
  return (
    user &&
    typeof user === "object" &&
    user.id &&
    typeof user.email === "string"
  );
};

// Helper function to map database task to UI task
const mapDbTaskToUITask = (dbTask: any, projectName: string): Task => {
  // Add null safety check
  if (!dbTask || !dbTask.id) {
    throw new Error("Invalid task data: task or task.id is null/undefined");
  }

  return {
    id: dbTask.id,
    title: dbTask.title || "Untitled Task",
    project: projectName || "Unknown Project",
    goal: dbTask.goal || "",
    effort: dbTask.effort === 1 ? "S" : dbTask.effort === 2 ? "M" : "L",
    priority:
      dbTask.priority === "high"
        ? "High"
        : dbTask.priority === "medium"
          ? "Med"
          : "Low",
    status: dbTask.status || "todo",
    difficulty: dbTask.difficulty_level || "easy",
    deliverable: dbTask.deliverable || "",
    bottleneck: dbTask.bottleneck || "",
    progress: dbTask.progress || "",
    continueTomorrow: dbTask.continue_tomorrow || false,
  };
};

// API service functions
const apiService = {
  getHeaders() {
    const token = Cookies.get("token");
    console.log("API Headers - Token:", token ? "Present" : "Missing");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  },

  async fetchUsers(): Promise<User[]> {
    try {
      console.log(
        "Fetching users from:",
        `${process.env.NEXT_PUBLIC_API_URL}/users`
      );
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch users: ${response.status} ${response.statusText}`
        );
      }

      const responseData = await response.json();
      console.log("Users API raw response:", responseData);

      const usersData = extractDataFromResponse(responseData);
      console.log("Extracted users data:", usersData);

      const validUsers = usersData.filter(isValidUser);
      console.log("Valid users:", validUsers);

      return validUsers;
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      throw error;
    }
  },

  async fetchUserProfile(userId: string): Promise<any> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/profiles/by-user/${userId}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(
          `Failed to fetch user profile: ${response.status} ${response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      throw error;
    }
  },

  async fetchProjects(): Promise<Project[]> {
    try {
      console.log(
        "Fetching projects from:",
        `${process.env.NEXT_PUBLIC_API_URL}/projects`
      );
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch projects: ${response.status} ${response.statusText}`
        );
      }

      const responseData = await response.json();
      console.log("Projects API raw response:", responseData);

      const projectsData = extractDataFromResponse(responseData);
      console.log("Extracted projects data:", projectsData);

      const projectsWithTasks = await Promise.all(
        projectsData.map(async (project: any) => {
          try {
            console.log(
              `Fetching tasks for project ${project.id}:`,
              `${process.env.NEXT_PUBLIC_API_URL}/tasks/project/${project.id}`
            );
            const tasksResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/tasks/project/${project.id}`,
              { headers: this.getHeaders() }
            );

            if (tasksResponse.ok) {
              const tasksData = await tasksResponse.json();
              const tasks = extractDataFromResponse(tasksData);
              console.log(`Tasks for project ${project.id}:`, tasks);
              return { ...project, tasks };
            }
            console.warn(`Failed to fetch tasks for project ${project.id}`);
            return { ...project, tasks: [] };
          } catch (error) {
            console.error(
              `Error fetching tasks for project ${project.id}:`,
              error
            );
            return { ...project, tasks: [] };
          }
        })
      );

      console.log("Final projects with tasks:", projectsWithTasks);
      return projectsWithTasks;
    } catch (error) {
      console.error("Error in fetchProjects:", error);
      throw error;
    }
  },

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    console.log("Updating task status:", { taskId, status });
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tasks/${taskId}`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    console.log(
      "Update task status response:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update task status failed:", errorText);
      throw new Error(
        `Failed to update task status: ${response.status} ${errorText}`
      );
    }
  },

  async updateTaskDetails(taskId: string, updates: any): Promise<void> {
    console.log("Updating task details:", { taskId, updates });
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tasks/${taskId}`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      }
    );

    console.log(
      "Update task details response:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update task details failed:", errorText);
      throw new Error(
        `Failed to update task details: ${response.status} ${errorText}`
      );
    }
  },

  async createProject(projectData: any): Promise<Project> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(projectData),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create project");
    }

    return response.json();
  },

  async createTask(taskData: any): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      throw new Error("Failed to create task");
    }

    return response.json();
  },

  async deleteTask(taskId: string): Promise<void> {
    console.log("Deleting task:", { taskId });
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tasks/id/${taskId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );

    console.log("Delete task response:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Delete task failed:", errorText);
      throw new Error(`Failed to delete task: ${response.status} ${errorText}`);
    }
  },
};

// Custom hooks yang disesuaikan
const useProjectsCustom = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.fetchProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error("Error in useProjectsCustom:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await apiService.deleteTask(taskId);
      await fetchProjects();
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, loading, error, deleteTask, refetch: fetchProjects };
};

const useUsersCustom = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.fetchUsers();

      const normalizedUsers = data.map((user) => {
        const userRole = (user.role || user.role || "SE").toUpperCase().trim();

        return {
          ...user,
          role: userRole,
          full_name: user.full_name || user.email,
          email: user.email || "",
          created_at: user.created_at || new Date().toISOString(),
        };
      });

      console.log("Normalized users:", normalizedUsers);
      setUsers(normalizedUsers);
      setError(null);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, error, refetch: fetchUsers };
};

export default function Index() {
  const { user } = useAuth();
  const isGuest = !user;
  const {
    projects: projectsData,
    loading: projectsLoading,
    deleteTask: deleteDbTask,
    refetch,
  } = useProjectsCustom();
  const {
    users: usersData,
    loading: usersLoading,
    error: usersError,
  } = useUsersCustom();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [streak, setStreak] = useState(3);
  const [showSCE, setShowSCE] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const profile = await apiService.fetchUserProfile(user.id);
          setUserProfile(profile);
          if (profile) {
            setShowSCE(profile.role === "SCE");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Convert projects tasks to UI tasks
  useEffect(() => {
    if (projectsData && Array.isArray(projectsData)) {
      console.log("Converting projects to tasks, projectsData:", projectsData);
      const allTasks = projectsData.flatMap((project) => {
        if (!project || !Array.isArray(project.tasks)) {
          return [];
        }
        console.log(`Project ${project.name} has tasks:`, project.tasks);
        return project.tasks
          .filter((task) => task && task.id) // Filter out null/invalid tasks
          .map((task) => {
            try {
              const uiTask = mapDbTaskToUITask(task, project.name);
              console.log("Mapped task:", { original: task, mapped: uiTask });
              return uiTask;
            } catch (error) {
              console.error("Error mapping task:", error, task);
              return null;
            }
          })
          .filter(Boolean); // Remove null values
      });
      console.log("Final allTasks array:", allTasks);
      setTasks(allTasks);
    }
  }, [projectsData]);

  // Debug: Log users data
  useEffect(() => {
    console.log("All users data:", usersData);
    console.log("Users loading:", usersLoading);
    console.log("Users error:", usersError);

    if (usersData.length > 0) {
      const roleCount = usersData.reduce((acc, user) => {
        const role = user.role || "Unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log("Role distribution:", roleCount);
    }
  }, [usersData, usersLoading, usersError]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    console.log("updateTaskStatus called with:", {
      taskId,
      status,
      taskIdType: typeof taskId,
    });

    if (!taskId) {
      console.error("Task ID is undefined or null!");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Task ID is missing. Please refresh the page.",
      });
      return;
    }

    try {
      await apiService.updateTaskStatus(taskId, status);

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: status as any } : task
        )
      );

      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status.",
      });
    }
  };

  const saveTaskDetails = async (
    taskId: string,
    deliverable: string,
    bottleneck: string,
    progress?: string
  ) => {
    try {
      const updates: any = {};
      if (deliverable) updates.deliverable = deliverable;
      if (bottleneck) updates.bottleneck = bottleneck;
      if (progress) updates.progress = progress;

      await apiService.updateTaskDetails(taskId, updates);

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, deliverable, bottleneck, progress }
            : task
        )
      );

      toast({
        title: "Task details saved",
        description: "Task details have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving task details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save task details.",
      });
    }
  };

  const updateMiddayStatus = (
    taskId: string,
    status: "on-track" | "at-risk" | "blocked"
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, middayStatus: status } : task
      )
    );
  };

  const updateEODOutcome = (
    taskId: string,
    outcome: "done" | "partial" | "not-started",
    deliverable?: string,
    notes?: string
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, eodOutcome: outcome, deliverable, notes }
          : task
      )
    );
  };

  const updateCarryoverProgress = async (taskId: string, progress: string) => {
    try {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, progress } : task))
      );

      toast({
        title: "Progress saved",
        description: "Task progress has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save progress.",
      });
    }
  };

  const markContinueTomorrow = async (taskId: string, progress: string) => {
    try {
      await apiService.updateTaskDetails(taskId, {
        continue_tomorrow: true,
        progress: progress,
      });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, continueTomorrow: true, progress }
            : task
        )
      );

      toast({
        title: "Task marked to continue tomorrow",
        description: "Task will be carried over to tomorrow.",
      });
    } catch (error) {
      console.error("Error marking task to continue tomorrow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark task to continue tomorrow.",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDbTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete task.",
      });
    }
  };

  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: Sun };
    if (hour < 17) return { text: "Good afternoon", icon: Sun };
    return { text: "Good evening", icon: Sun };
  };

  const greeting = getCurrentTimeGreeting();
  const GreetingIcon = greeting.icon;

  const handleLoginClick = () => {
    window.location.href = "/auth";
  };

  // Calculate week number
  const getWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.ceil(diff / oneWeek);
  };

  // Filter users berdasarkan role
  const filteredUsers = usersData.filter((user) => {
    const userRole = (user.role || "").toUpperCase().trim();
    const filterRole = (showSCE ? "SCE" : "SE").toUpperCase().trim();
    const matches = userRole === filterRole;

    console.log(`Filtering user:`, {
      email: user.email,
      role: user.role,
      normalized_role: userRole,
      filter_role: filterRole,
      matches: matches,
    });

    return matches;
  });

  // Calculate new users this week
  const newThisWeek = filteredUsers.filter((user) => {
    try {
      const userDate = new Date(user.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return userDate > weekAgo;
    } catch {
      return false;
    }
  }).length;

  // Calculate user tasks
  const userTasksMap: { [key: string]: Task[] } = {};

  filteredUsers.forEach((user) => {
    try {
      const safeProjectsData = Array.isArray(projectsData) ? projectsData : [];
      const userProjects = safeProjectsData.filter(
        (project) => project && project.user_id === user.id
      );
      const userTasks = userProjects.flatMap((project) => {
        if (!project || !Array.isArray(project.tasks)) {
          return [];
        }
        return project.tasks
          .filter((task) => task && task.id) // Filter out null/invalid tasks
          .map((task) => {
            try {
              const mappedTask = mapDbTaskToUITask(task, project.name);
              console.log(`User ${user.email} task mapping:`, {
                original: task,
                mapped: mappedTask,
              });
              return mappedTask;
            } catch (error) {
              console.error(
                `Error mapping task for user ${user.id}:`,
                error,
                task
              );
              return null;
            }
          })
          .filter(Boolean); // Remove null values
      });
      console.log(`User ${user.email} total tasks:`, userTasks);
      userTasksMap[user.id] = userTasks;
    } catch (error) {
      console.error(`Error processing tasks for user ${user.id}:`, error);
      userTasksMap[user.id] = [];
    }
  });

  const totalTasks = tasks.length;

  if (projectsLoading || usersLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading tasks</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header */}
        <header className="bg-card border-b border-border shadow-card">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GreetingIcon className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                  {greeting.text}, {isGuest ? 'Guest' : userProfile?.full_name || user?.full_name || user?.email || 'User'} 🌤️
                  {isGuest && <span className="text-sm font-normal text-muted-foreground ml-2">(Read-only mode)</span>}
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  <Calendar className="w-3 h-3 mr-1" />
                  Week {getWeekNumber()}
                </Badge>
                <Badge className="bg-gradient-success text-success-foreground">
                      <Flame className="w-3 h-3 mr-1" />
                      Streak: {streak} days
                    </Badge>
                {!isGuest && (
                  <>
                    <Button size="sm" className="bg-gradient-primary">
                      Quick Add [⌘K]
                    </Button>
                  </>
                )}
                
                {isGuest && (
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={handleLoginClick}
                    className="bg-gradient-primary"
                  >
                    Login to Create Tasks
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Pending Tasks */}
          {user && <PendingTasks onTaskReassigned={refetch} />}

          {/* Weekly Goals */}
          <WeeklyGoals />

          {/* Capacity */}
          <CapacityBar />

          {/* Team & Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Team & Tasks
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="role-switch" className="text-sm font-medium">
                  {showSCE ? "SCE" : "SE"} Users
                </Label>
                <Switch
                  id="role-switch"
                  checked={showSCE}
                  onCheckedChange={setShowSCE}
                />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4 bg-gradient-subtle border border-border shadow-card">
                <div className="text-2xl font-bold text-primary">
                  {filteredUsers.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total {showSCE ? "SCE" : "SE"} Users
                </div>
              </Card>

              <Card className="p-4 bg-gradient-subtle border border-border shadow-card">
                <div className="text-2xl font-bold text-success">
                  {newThisWeek}
                </div>
                <div className="text-sm text-muted-foreground">
                  New This Week
                </div>
              </Card>

              <Card className="p-4 bg-gradient-subtle border border-border shadow-card">
                <div className="text-2xl font-bold text-warning">
                  {totalTasks}
                </div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </Card>
            </div>

            {/* User Cards with Tasks menggunakan TaskGroups */}
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const userTasks = userTasksMap[user.id] || [];

                return (
                  <Card
                    key={user.id}
                    className="p-6 bg-gradient-subtle border border-border shadow-card"
                  >
                    {/* User Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.full_name?.charAt(0) ||
                              user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-foreground">
                            {user.full_name || user.email}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {user.role || "User"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {userTasks.length} tasks
                        </Badge>
                      </div>
                    </div>

                    {/* User Tasks menggunakan TaskGroups */}
                    <div className="space-y-3">
                      {userTasks.length > 0 ? (
                        <>
                          <h4 className="text-sm font-medium text-foreground">
                            Tasks:
                          </h4>
                          <TaskGroups
                            tasks={userTasks}
                            isReadOnly={true}
                            isGuest={isGuest}
                            onStatusChange={updateTaskStatus}
                            onMiddayUpdate={updateMiddayStatus}
                            onEODUpdate={updateEODOutcome}
                            onCarryoverUpdate={updateCarryoverProgress}
                            onSaveDetails={saveTaskDetails}
                            onDelete={deleteTask}
                            onContinueTomorrow={markContinueTomorrow}
                          />
                        </>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No tasks found for this user
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-6 text-center">
                <div className="text-muted-foreground mb-4">
                  No {showSCE ? "SCE" : "SE"} users found.
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}