"use client";

import { useState, useEffect } from "react";
import { Sun, Flame, Clock3, Calendar, AlertTriangle, Users } from "lucide-react";
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
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Cookies from "js-cookie"; // Changed from cookies-next to js-cookie

// Helper function to map database task to UI task
const mapDbTaskToUITask = (dbTask: any, projectName: string): Task => {
  return {
    id: dbTask.id,
    title: dbTask.title,
    project: projectName,
    goal: "", // Could be derived from project description
    effort: dbTask.effort === 1 ? "S" : dbTask.effort === 2 ? "M" : "L",
    priority: dbTask.priority === "high" ? "High" : dbTask.priority === "medium" ? "Med" : "Low",
    status: dbTask.status,
    difficulty: dbTask.difficulty_level,
    deliverable: dbTask.deliverable,
    bottleneck: dbTask.bottleneck,
    progress: dbTask.progress || "",
    continueTomorrow: dbTask.continue_tomorrow || false
  };
};

// Function to get authorization headers
const getAuthHeaders = () => {
  const token = Cookies.get('token'); // Changed from getCookie to Cookies.get
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  return headers;
};

export default function Index() {
  const { user, session } = useAuth();
  const { projects, loading, deleteTask: deleteDbTask, refetch } = useProjects();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentMode, setCurrentMode] = useState<"progress" | "midday" | "eod" | "carryover">("progress");
  const [streak, setStreak] = useState(3);
  const [expandedTaskDetails, setExpandedTaskDetails] = useState<Set<string>>(new Set());
  const [showSCE, setShowSCE] = useState(false);
  const { users: usersData, loading: usersLoading } = useUsers();
  const [users, setUsers] = useState<any[]>([]);

  // API base URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Function to get headers with authorization
  const getHeaders = () => {
    const token = session?.token || Cookies.get('token'); // Changed to Cookies.get
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  // Ensure users is always an array
  useEffect(() => {
    if (usersData && Array.isArray(usersData)) {
      setUsers(usersData);
    } else if (usersData) {
      // If usersData is not an array but exists, convert it to array
      setUsers([usersData]);
    } else {
      setUsers([]);
    }
  }, [usersData]);

  // Fetch user profile and set default view based on user role
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const headers = getHeaders();
          const response = await fetch(`${API_URL}/profiles/by-user/${user.id}`, {
            headers
          });
          
          if (!response.ok) throw new Error('Failed to fetch profile');
          
          const data = await response.json();
          if (data) {
            setUserProfile(data);
            // Set default view based on user role
            setShowSCE(data.role === 'SCE');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load user profile.",
          });
        }
      }
    };

    fetchUserProfile();
  }, [user, API_URL, toast, session]);

  // Convert projects tasks to UI tasks
  useEffect(() => {
    if (projects) {
      const allTasks = projects.flatMap(project => 
        project.tasks.map(task => mapDbTaskToUITask(task, project.name))
      );
      setTasks(allTasks);
    }
  }, [projects]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update task status');

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: status as any } : task
      ));

      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status.",
      });
    }
  };

  const saveTaskDetails = async (taskId: string, deliverable: string, bottleneck: string, progress?: string) => {
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ 
          deliverable: deliverable || null,
          bottleneck: bottleneck || null
        }),
      });

      if (!response.ok) throw new Error('Failed to save task details');

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, deliverable, bottleneck, progress } : task
      ));

      toast({
        title: "Task details saved",
        description: "Task details have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving task details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save task details.",
      });
    }
  };

  const updateMiddayStatus = (taskId: string, status: "on-track" | "at-risk" | "blocked") => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, middayStatus: status } : task
    ));
  };

  const updateEODOutcome = (taskId: string, outcome: "done" | "partial" | "not-started", deliverable?: string, notes?: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, eodOutcome: outcome, deliverable, notes } : task
    ));
  };

  const updateCarryoverProgress = async (taskId: string, progress: string) => {
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ progress }),
      });

      if (!response.ok) throw new Error('Failed to save progress');

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, progress } : task
      ));

      toast({
        title: "Progress saved",
        description: "Task progress has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save progress.",
      });
    }
  };

  const markContinueTomorrow = async (taskId: string) => {
    console.log('markContinueTomorrow called in Index with taskId:', taskId);
    try {
      // Update database
      console.log('Updating database for task:', taskId);
      const headers = getHeaders();
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ continue_tomorrow: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Database update error:', errorData);
        throw new Error(errorData.message || 'Failed to update task');
      }

      console.log('Database updated successfully');

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, continueTomorrow: true } : task
      ));

      toast({
        title: "Task marked to continue tomorrow",
        description: "Task will be carried over to tomorrow.",
      });
    } catch (error) {
      console.error('Error marking task to continue tomorrow:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark task to continue tomorrow.",
      });
    }
  };

  const toggleTaskDetails = (taskId: string) => {
    setExpandedTaskDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const addTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      const headers = getHeaders();
      
      // Find existing project or create new one
      let projectId = null;
      const existingProject = projects.find(p => p.name === newTask.project);
      
      if (existingProject) {
        projectId = existingProject.id;
      } else {
        // Create new project
        const response = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: newTask.project,
            description: newTask.goal || `Project for ${newTask.project}`,
            user_id: user?.id
          }),
        });

        if (!response.ok) throw new Error('Failed to create project');
        
        const newProject = await response.json();
        projectId = newProject.id;
      }

      // Create task
      const effortValue = newTask.effort === "S" ? 1 : newTask.effort === "M" ? 2 : 3;
      const priorityValue = newTask.priority === "High" ? "high" : newTask.priority === "Med" ? "medium" : "low";

      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTask.title,
          project_id: projectId,
          effort: effortValue,
          priority: priorityValue,
          status: newTask.status || 'todo',
          difficulty_level: newTask.difficulty || 'moderate',
          due_date: new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');
      
      const newDbTask = await response.json();

      // Add to local state
      const uiTask: Task = {
        ...newTask,
        id: newDbTask.id
      };
      setTasks(prev => [...prev, uiTask]);

      // Refetch to ensure consistency
      refetch();

      toast({
        title: "Task added",
        description: "New task has been created successfully.",
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add task.",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDbTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
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

  if (loading || usersLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading tasks and users...</div>
        </div>
      </Layout>
    );
  }

  // Filter users based on role
  const filteredUsers = users.filter(user => user.role === (showSCE ? 'SCE' : 'SE'));

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
                  {greeting.text}, {userProfile?.full_name || 'User'} 🌤️
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  <Calendar className="w-3 h-3 mr-1" />
                  Week 35
                </Badge>
                <Badge className="bg-gradient-success text-success-foreground">
                  <Flame className="w-3 h-3 mr-1" />
                  Streak: {streak} days
                </Badge>
                <Button size="sm" className="bg-gradient-primary">
                  Quick Add [⌘K]
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Pending Tasks */}
          <PendingTasks onTaskReassigned={refetch} />

          {/* Weekly Goals */}
          <WeeklyGoals />

          {/* Capacity */}
          <CapacityBar />

          {/* Users and Tasks Combined */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Team & Tasks</h2>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="user-type-switch" className="text-sm font-medium">
                  {showSCE ? 'SCE' : 'SE'} Users
                </Label>
                <Switch
                  id="user-type-switch"
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
                  Total {showSCE ? 'SCE' : 'SE'} Users
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-subtle border border-border shadow-card">
                <div className="text-2xl font-bold text-success">
                  {filteredUsers.filter(user => 
                    new Date(user.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  New This Week
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-subtle border border-border shadow-card">
                <div className="text-2xl font-bold text-warning">
                  {tasks.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Tasks
                </div>
              </Card>
            </div>

            {/* User Cards with Tasks */}
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => {
                // Find projects for this user (matching by user ID)
                const userProjects = projects.filter(project => {
                  return project.user_id === user.id;
                });
                
                // Get all tasks for this user's projects
                const userTasks = userProjects.flatMap(project => 
                  project.tasks.map(task => mapDbTaskToUITask(task, project.name))
                );

                return (
                  <Card key={user.id} className="p-6 bg-gradient-subtle border border-border shadow-card">
                    {/* User Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
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
                          {user.role} {/* Backend uses 'role' but UI label is 'User Type' */}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {userTasks.length} tasks
                        </Badge>
                      </div>
                    </div>

                    {/* User Tasks */}
                    <div className="space-y-3">
                      {userTasks.length > 0 ? (
                        <>
                          <h4 className="text-sm font-medium text-foreground">Tasks:</h4>
                          <div className="space-y-2">
                            {userTasks.map((task) => (
                              <div key={task.id} className="p-3 bg-background rounded border border-border">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground text-sm">
                                      {task.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {task.project} • {task.priority} Priority • {task.effort} Effort
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={
                                        task.status === 'completed' ? 'default' : 
                                        task.status === 'in-progress' ? 'secondary' : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {task.status}
                                    </Badge>
                                    {task.continueTomorrow && (
                                      <Badge variant="outline" className="text-xs text-warning">
                                        Continue Tomorrow
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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
                <div className="text-muted-foreground">
                  No {showSCE ? 'SCE' : 'SE'} users found
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}