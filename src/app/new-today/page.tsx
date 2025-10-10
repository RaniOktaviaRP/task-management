"use client";

import { useState, useEffect } from "react";
import { Sun, Flame, Clock3, Calendar } from "lucide-react";
import { TaskCard, type Task } from "@/components/TaskCard";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { CapacityBar } from "@/components/CapacityBar";
import { QuickAdd } from "@/components/QuickAdd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Cookies from "js-cookie";

interface DailyReflection {
  id: string;
  date: string;
  wentWell: string;
  whereStuck: string;
  createdAt: Date;
}

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Function to get headers with authorization
const getHeaders = (): HeadersInit => {
  const token = Cookies.get('token');
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
};

// Convert database tasks to UI task format
const mapDbTaskToUITask = (dbTask: any, projectName: string): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  project: projectName,
  goal: "Project Goal",
  effort: dbTask.effort === 1 ? "S" : dbTask.effort === 2 ? "M" : "L",
  priority: dbTask.priority === "high" ? "High" : dbTask.priority === "low" ? "Low" : "Med",
  status: dbTask.status as "todo" | "in-progress" | "completed",
  deliverable: dbTask.deliverable || "",
  bottleneck: dbTask.bottleneck || "",
  progress: dbTask.progress || "",
  continueTomorrow: dbTask.continue_tomorrow || false
});

export default function ToDoToday() {
  const { user } = useAuth();
  const { projects, loading, deleteTask: deleteTaskFromDB } = useProjects();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMode, setCurrentMode] = useState<"midday" | "eod" | "carryover">("midday");
  const [streak, setStreak] = useState(3);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const headers = getHeaders();
        const response = await fetch(`${API_BASE_URL}/profiles`, {
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const profile = await response.json();
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback
        setUserProfile({ full_name: null, email: 'User' });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Convert project tasks to UI tasks when projects data loads
  useEffect(() => {
    if (projects && projects.length > 0) {
      const allTasks: Task[] = [];
      projects.forEach(project => {
        project.tasks.forEach((task: any) => {
          allTasks.push(mapDbTaskToUITask(task, project.name));
        });
      });
      setTasks(allTasks);
    } else if (!loading) {
      setTasks([]);
    }
  }, [projects, loading]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    // Update UI immediately
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: status as "todo" | "in-progress" | "completed" } : task
    ));

    // Map UI status to database status
    let dbStatus: "todo" | "in-progress" | "completed" = "todo";
    if (status === "in-progress") dbStatus = "in-progress";
    if (status === "completed") dbStatus = "completed";

    try {
      const headers = getHeaders();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: dbStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert UI change on error
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: "todo" as const } : task
      ));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status",
      });
    }
  };

  const saveTaskDetails = async (taskId: string, deliverable: string, bottleneck: string, progress?: string) => {
    console.log('saveTaskDetails called', { taskId, deliverable, bottleneck, progress });
    
    // Update local state immediately for better UX
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, deliverable, bottleneck, progress } : task
    ));

    try {
      const headers = getHeaders();
      
      // Prepare update data
      const updateData: any = { 
        deliverable: deliverable || null, 
        bottleneck: bottleneck || null 
      };
      
      if (progress !== undefined) {
        updateData.progress = progress || null;
      }

      console.log('Saving task details with data:', updateData);

      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response not OK:', errorText);
        throw new Error(`Failed to save task details: ${response.status} ${response.statusText}`);
      }
      
      console.log('Task details saved successfully');
      
      toast({
        title: "Task details saved",
        description: "Task details have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving task details:', error);
      // Revert on error
      setTasks(previousTasks);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save task details. Please check your connection.",
      });
    }
  };

  const updateMiddayStatus = (taskId: string, status: "on-track" | "at-risk" | "blocked") => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, middayStatus: status } : task
    ));
  };

  const updateCarryoverProgress = async (taskId: string, progress: string) => {
    const previousTasks = [...tasks];
    
    try {
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, progress } : task
      ));

      const headers = getHeaders();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ progress }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      toast({
        title: "Progress saved",
        description: "Task progress has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving progress:', error);
      // Revert on error
      setTasks(previousTasks);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save progress.",
      });
    }
  };

  const updateEODOutcome = (taskId: string, outcome: "done" | "partial" | "not-started", deliverable?: string, notes?: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, eodOutcome: outcome, deliverable, notes } : task
    ));
  };

  const markContinueTomorrow = async (taskId: string, progress: string) => {
    console.log('markContinueTomorrow called with taskId:', taskId, 'progress:', progress);
    
    const previousTasks = [...tasks];
    
    // Update local state immediately for better UX
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, continueTomorrow: true, progress: progress } : task
    ));

    try {
      const headers = getHeaders();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          continue_tomorrow: true,
          progress: progress || null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database update error:', response.status, errorText);
        throw new Error(`Failed to mark task to continue tomorrow: ${response.status}`);
      }

      console.log('Database updated successfully');

      toast({
        title: "Task marked to continue tomorrow",
        description: "Task will be carried over to tomorrow.",
      });
    } catch (error) {
      console.error('Error marking task to continue tomorrow:', error);
      // Revert on error
      setTasks(previousTasks);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark task to continue tomorrow. Please check your connection.",
      });
    }
  };

  const addTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      const headers = getHeaders();
      
      // Find existing project or create new one
      let projectId = null;
      const existingProject = projects?.find(p => p.name === newTask.project);
      
      if (existingProject) {
        projectId = existingProject.id;
      } else {
        // Create new project with required trend field
          const projectData = {
            name: newTask.project,
            description: newTask.goal || `Project for ${newTask.project}`,
            trend: "stable",
            confidence: 50,   // ✅ tambahkan default
            progress: 50,     // ✅ tambahkan default
            user_id: user?.id || "", // kalau backend butuh user
          };

        console.log('Creating new project with data:', projectData);

        const response = await fetch(`${API_BASE_URL}/projects`, {
          method: 'POST',
          headers,
          body: JSON.stringify(projectData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Project creation failed:', errorText);
          throw new Error(`Failed to create project: ${errorText}`);
        }
        
        const newProject = await response.json();
        projectId = newProject.id;
        console.log('New project created with ID:', projectId);
      }

      // Map UI values to database values
      const dbEffort = newTask.effort === "S" ? 1 : newTask.effort === "M" ? 2 : 3;
      const dbPriority = newTask.priority === "High" ? "high" : newTask.priority === "Low" ? "low" : "medium";

      // Insert into database
      const taskData = {
        title: newTask.title,
        project_id: projectId,
        effort: dbEffort,
        priority: dbPriority,
        status: 'todo',
        difficulty_level: 'moderate'
      };

      console.log('Creating task with data:', taskData);

      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Task creation failed:', errorText);
        throw new Error(`Failed to create task: ${errorText}`);
      }
      
      const newDbTask = await response.json();
      console.log('New task created:', newDbTask);

      // Add to local state with generated ID
      const uiTask: Task = {
        ...newTask,
        id: newDbTask.id
      };
      setTasks(prev => [...prev, uiTask]);

      toast({
        title: "Task added",
        description: "New task has been created successfully.",
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add task. Please try again.",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    const previousTasks = [...tasks];
    
    try {
      // Remove from local state immediately
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      await deleteTaskFromDB(taskId);
      
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully"
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      // Revert on error
      setTasks(previousTasks);
      toast({
        title: "Error deleting task",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  };

  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: Sun };
    if (hour < 17) return { text: "Good afternoon", icon: Sun };
    return { text: "Good evening", icon: Sun };
  };

  const saveReflection = (wentWell: string, whereStuck: string) => {
    const newReflection: DailyReflection = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      wentWell,
      whereStuck,
      createdAt: new Date()
    };
    
    setReflections(prev => [newReflection, ...prev]);
  };

  const greeting = getCurrentTimeGreeting();
  const GreetingIcon = greeting.icon;

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading tasks...</div>
        </div>
      </Layout>
    );
  }

  // Filter tasks based on current mode
  const filteredTasks = currentMode === "carryover" 
    ? tasks.filter(task => task.continueTomorrow === true)
    : tasks;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border shadow-card">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GreetingIcon className="w-6 h-6 text-primary" />
                {user ? (
                  <div className="flex flex-col">
                    <h1 className="text-xl font-semibold text-foreground">
                      {greeting.text}, {userProfile?.full_name || user.full_name || user.email} 🌤️
                    </h1>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <h1 className="text-xl font-semibold text-foreground">
                        {greeting.text}, Guest 🌤️
                      </h1>
                    </div>
                    <Button 
                      variant="default" 
                      className="bg-gradient-primary text-primary-foreground" 
                      onClick={() => window.location.href = '/auth'}
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Tampilkan bagian kanan header hanya jika user sudah login */}
              {user && (
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm">
                    <Calendar className="w-3 h-3 mr-1" />
                    Week {Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), 0, 1).getDay()) / 7)}
                  </Badge>
                  <Badge className="bg-gradient-success text-success-foreground">
                    <Flame className="w-3 h-3 mr-1" />
                    Streak: {streak} days
                  </Badge>
                  <Button variant="default" size="sm" className="bg-gradient-primary text-primary-foreground">
                    Quick Add [⌘K]
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Weekly Goals */}
          <WeeklyGoals />

          {/* Capacity */}
          <CapacityBar />

          {/* Mode Toggle */}
          <Card className="p-4 bg-card border border-border shadow-card">
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "midday", label: "MD (09:00 - 13:00)" },
                { key: "eod", label: "EOD (13:00 - 17:00)" },
                { key: "carryover", label: "📅 Continue Tomorrow" }
              ].map((mode) => (
                <Button
                  key={mode.key}
                  variant="default"
                  size="sm"
                  onClick={() => setCurrentMode(mode.key as any)}
                  className={
                    currentMode === mode.key 
                      ? "bg-gradient-primary text-primary-foreground" 
                      : "border-border text-foreground hover:bg-muted"
                  }
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Tasks Section */}
          <div className="space-y-4">
            {/* Quick Add - Only show for authenticated users */}
            {user && <QuickAdd onAddTask={addTask} />}
            
            {currentMode === "midday" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock3 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Midday vibes check ✨</h2>
                  <span className="text-sm text-muted-foreground">09:00 — 13:00</span>
                </div>
                
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks found. {user ? "Add a task to get started!" : "Sign in to manage tasks."}
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isMiddayMode={true}
                      isGuest={!user}
                      onStatusChange={updateTaskStatus}
                      onMiddayUpdate={updateMiddayStatus}
                      onSaveDetails={saveTaskDetails}
                      onDelete={deleteTask}
                      onContinueTomorrow={markContinueTomorrow}
                    />
                  ))
                )}
              </div>
            )}

            {currentMode === "eod" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-gradient-success text-success-foreground">🏁</Badge>
                  <h2 className="text-lg font-semibold text-foreground">Victory lap</h2>
                  <span className="text-sm text-muted-foreground">13:00 — 17:00</span>
                </div>
                
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks found. {user ? "Add a task to get started!" : "Sign in to manage tasks."}
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isEODMode={true}
                      isGuest={!user}
                      onStatusChange={updateTaskStatus}
                      onEODUpdate={updateEODOutcome}
                      onSaveDetails={saveTaskDetails}
                      onDelete={deleteTask}
                      onContinueTomorrow={markContinueTomorrow}
                    />
                  ))
                )}
              </div>
            )}

            {currentMode === "carryover" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-warning/10 text-warning">📅</Badge>
                  <h2 className="text-lg font-semibold text-foreground">Continue Tomorrow</h2>
                  <span className="text-sm text-muted-foreground">Tasks with obstacles</span>
                </div>
                
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks marked to continue tomorrow.
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isCarryoverMode={true}
                      isGuest={!user}
                      onStatusChange={updateTaskStatus}
                      onCarryoverUpdate={updateCarryoverProgress}
                      onSaveDetails={saveTaskDetails}
                      onDelete={deleteTask}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}