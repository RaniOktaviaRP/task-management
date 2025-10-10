"use client";

import { useState, useEffect } from "react";
import { Clock, RotateCcw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";

interface PendingTask {
  id: string;
  title: string;
  project_name: string;
  due_date: string;
  priority: string;
  effort: number;
  status: string;
}

interface PendingTasksProps {
  onTaskReassigned: () => void;
}

// API service for pending tasks
const pendingTasksService = {
  getHeaders() {
    const token = Cookies.get('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  },

  async fetchPendingTasks(userId: string): Promise<PendingTask[]> {
    try {
      // First, get all projects for the user
      const projectsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/by-user/${userId}`, {
        headers: this.getHeaders()
      });
      
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch user projects');
      }
      
      const result = await projectsResponse.json();
      const projects = result.data || result;
      
      if (!Array.isArray(projects)) {
        console.warn('No projects found or invalid projects data');
        return [];
      }

      // Get incomplete tasks from previous days for all user projects
      const today = new Date().toISOString().split('T')[0];
      const allPendingTasks: PendingTask[] = [];

      // Fetch tasks for each project
      for (const project of projects) {
        try {
          const tasksResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/tasks/project/${project.id}`,
            { headers: this.getHeaders() }
          );
          
          if (tasksResponse.ok) {
            const tasksResult = await tasksResponse.json();
            const tasks = tasksResult.data || tasksResult;
            
            if (Array.isArray(tasks)) {
              const pendingTasks = tasks
                .filter((task: any) => 
                  (task.status === 'todo' || task.status === 'in-progress') &&
                  task.due_date && 
                  task.due_date < today
                )
                .map((task: any) => ({
                  id: task.id,
                  title: task.title,
                  project_name: project.name,
                  due_date: task.due_date,
                  priority: task.priority,
                  effort: task.effort,
                  status: task.status
                }));
              
              allPendingTasks.push(...pendingTasks);
            }
          }
        } catch (error) {
          console.error(`Error fetching tasks for project ${project.id}:`, error);
        }
      }

      return allPendingTasks.sort((a, b) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
    } catch (error) {
      console.error('Error in fetchPendingTasks:', error);
      return [];
    }
  },

  async reassignTaskToToday(taskId: string): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/id/${taskId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ 
        due_date: new Date().toISOString().split('T')[0],
        status: 'todo'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to reassign task');
    }
  },

  async markTaskAsCompleted(taskId: string): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/id/${taskId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status: 'completed' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete task');
    }
  }
};

export const PendingTasks = ({ onTaskReassigned }: PendingTasksProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);

  const fetchPendingTasks = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const tasks = await pendingTasksService.fetchPendingTasks(user.id);
      setPendingTasks(tasks);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load pending tasks.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
  }, [user]);

  const reassignToToday = async (taskId: string) => {
    try {
      await pendingTasksService.reassignTaskToToday(taskId);

      setPendingTasks(prev => prev.filter(task => task.id !== taskId));
      onTaskReassigned();
      
      toast({
        title: "Task reassigned",
        description: "Task has been moved to today's schedule.",
      });
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reassign task.",
      });
    }
  };

  const markAsCompleted = async (taskId: string) => {
    try {
      await pendingTasksService.markTaskAsCompleted(taskId);

      setPendingTasks(prev => prev.filter(task => task.id !== taskId));
      onTaskReassigned();
      
      toast({
        title: "Task completed",
        description: "Task has been marked as completed.",
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete task.",
      });
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getEffortText = (effort: number) => {
    switch (effort) {
      case 1: return 'S';
      case 2: return 'M';
      case 3: return 'L';
      default: return 'S';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <h3 className="font-medium text-foreground">Pending Tasks</h3>
          </div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </Card>
    );
  }

  if (pendingTasks.length === 0) return null;

  return (
    <Card className="p-4 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-warning" />
          <h3 className="font-medium text-foreground">
            Pending Tasks ({pendingTasks.length})
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPending(!showPending)}
          className="text-muted-foreground hover:text-foreground"
        >
          {showPending ? "Hide" : "Show"}
        </Button>
      </div>

      {showPending && (
        <div className="space-y-3">
          {pendingTasks.map((task) => {
            const daysOverdue = getDaysOverdue(task.due_date);
            
            return (
              <div 
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {task.project_name}
                    </Badge>
                    {daysOverdue > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {daysOverdue}d overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Due: {formatDate(task.due_date)}</span>
                    <Badge 
                      variant={getPriorityBadgeVariant(task.priority)}
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getEffortText(task.effort)}
                    </Badge>
                    <Badge 
                      variant={task.status === 'in-progress' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reassignToToday(task.id)}
                    className="h-8 px-2 text-primary hover:bg-primary/10"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAsCompleted(task.id)}
                    className="h-8 px-2 text-success hover:bg-success/10"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Done
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPending && pendingTasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} pending from previous days
          </div>
        </div>
      )}
    </Card>
  );
};