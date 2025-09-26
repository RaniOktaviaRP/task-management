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
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface DailyReflection {
  id: string;
  date: string;
  wentWell: string;
  whereStuck: string;
  createdAt: Date;
}

// API base URL - ganti dengan URL API Anda
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

// Convert database tasks to UI task format
const mapDbTaskToUITask = (dbTask: any, projectName: string): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  project: projectName,
  goal: "Project Goal", // Could be enhanced to fetch from project description
  effort: dbTask.effort === 1 ? "S" : dbTask.effort === 2 ? "M" : "L",
  priority: dbTask.priority === "high" ? "High" : dbTask.priority === "low" ? "Low" : "Med",
  status: dbTask.status as "todo" | "in-progress" | "completed",
  deliverable: dbTask.deliverable || "",
  bottleneck: dbTask.bottleneck || "",
  progress: dbTask.progress || "",
  continueTomorrow: dbTask.continue_tomorrow || false
});

// Custom hook untuk mengambil data proyek
const useProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      // Hapus task dari state lokal
      setProjects(prev => prev.map(project => ({
        ...project,
        tasks: project.tasks.filter((task: any) => task.id !== taskId)
      })));
      
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  return { projects, loading, deleteTask };
};

export default function ToDoToday() {
  const { projects, loading, deleteTask: deleteTaskFromDB } = useProjects();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMode, setCurrentMode] = useState<"midday" | "eod" | "carryover">("midday");
  const [streak, setStreak] = useState(3);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; email: string } | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/profile`);
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const profile = await response.json();
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback
        setUserProfile({ full_name: null, email: 'User' });
      }
    };
    
    fetchUserProfile();
  }, []);

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
    }
  }, [projects]);

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
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: dbStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const saveTaskDetails = async (taskId: string, deliverable: string, bottleneck: string) => {
    console.log('saveTaskDetails called', { taskId, deliverable, bottleneck });
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deliverable, bottleneck }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save task details');
      }
      
      console.log('Task details saved successfully');
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, deliverable, bottleneck } : task
      ));
    } catch (error) {
      console.error('Error saving task details:', error);
    }
  };

  const updateMiddayStatus = (taskId: string, status: "on-track" | "at-risk" | "blocked") => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, middayStatus: status } : task
    ));
  };

  const updateCarryoverProgress = (taskId: string, progress: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, progress } : task
    ));
  };

  const updateEODOutcome = (taskId: string, outcome: "done" | "partial" | "not-started", deliverable?: string, notes?: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, eodOutcome: outcome, deliverable, notes } : task
    ));
  };

  const markContinueTomorrow = async (taskId: string, progress: string) => {
    console.log('markContinueTomorrow called with taskId:', taskId, 'progress:', progress);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/continue`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          continue_tomorrow: true,
          progress: progress
        }),
      });

      if (!response.ok) {
        console.error('Database update error:', response.statusText);
        throw new Error('Failed to mark task to continue tomorrow');
      }

      console.log('Database updated successfully');

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, continueTomorrow: true, progress: progress } : task
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

  const addTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      // Map UI values to database values
      const dbEffort = newTask.effort === "S" ? 1 : newTask.effort === "M" ? 2 : 3;
      const dbPriority = newTask.priority === "High" ? "high" : newTask.priority === "Low" ? "low" : "medium";

      // Insert into database
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          project: newTask.project,
          effort: dbEffort,
          priority: dbPriority,
          status: 'todo'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      const data = await response.json();

      // Add to local state with generated ID
      const task: Task = {
        ...newTask,
        id: data.id,
        status: "todo"
      };
      setTasks(prev => [task, ...prev]);
    } catch (error) {
      console.error('Error adding task:', error);
      // You might want to show a toast notification here
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteTaskFromDB(taskId);
      
      // Remove from local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully"
      });
    } catch (error) {
      console.error('Error deleting task:', error);
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

  return (
    <Layout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GreetingIcon className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                {greeting.text}, {userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User'} 🌤️
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm border-border text-foreground">
                <Calendar className="w-3 h-3 mr-1 text-primary" />
                Week 35
              </Badge>
              <Badge className="bg-gradient-success text-success-foreground">
                <Flame className="w-3 h-3 mr-1" />
                Streak: {streak} days
              </Badge>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                Quick Add [⌘K]
              </Button>
            </div>
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
          <div className="flex gap-2">
            {["midday", "eod", "carryover"].map((mode) => (
              <Button
                key={mode}
                variant={currentMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentMode(mode as any)}
                className={currentMode === mode ? "bg-gradient-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"}
              >
                {mode === "midday" && "MD (09:00 - 13:00)"}
                {mode === "eod" && "EOD (13:00 - 17:00)"}
                {mode === "carryover" && "📅 Continue Tomorrow"}
              </Button>
            ))}
          </div>
        </Card>

        {/* Tasks Section */}
        <div className="space-y-4">
          {/* Quick Add */}
          <QuickAdd onAddTask={addTask} />
          
          {currentMode === "midday" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock3 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Midday vibes check ✨</h2>
                <span className="text-sm text-muted-foreground">09:00 — 13:00</span>
              </div>
              
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isMiddayMode={true}
                  onStatusChange={updateTaskStatus}
                  onMiddayUpdate={updateMiddayStatus}
                  onSaveDetails={saveTaskDetails}
                  onDelete={deleteTask}
                  onContinueTomorrow={markContinueTomorrow}
                />
              ))}
            </div>
          )}

          {currentMode === "eod" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-gradient-success text-success-foreground">🏁</Badge>
                <h2 className="text-lg font-semibold text-foreground">Victory lap</h2>
                <span className="text-sm text-muted-foreground">13:00 — 17:00</span>
              </div>
              
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isEODMode={true}
                  onStatusChange={updateTaskStatus}
                  onEODUpdate={updateEODOutcome}
                  onSaveDetails={saveTaskDetails}
                  onDelete={deleteTask}
                  onContinueTomorrow={markContinueTomorrow}
                />
              ))}
            </div>
          )}

          {currentMode === "carryover" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-warning/10 text-warning">📅</Badge>
                <h2 className="text-lg font-semibold text-foreground">Continue Tomorrow</h2>
                <span className="text-sm text-muted-foreground">Tasks with obstacles</span>
              </div>
              
              {tasks
                .filter(task => task.continueTomorrow === true)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCarryoverMode={true}
                    onStatusChange={updateTaskStatus}
                    onCarryoverUpdate={updateCarryoverProgress}
                    onSaveDetails={saveTaskDetails}
                    onDelete={deleteTask}
                  />
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </Layout>
  );
}