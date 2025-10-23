"use client";

import { useState, useEffect } from "react";
import { Clock, RotateCcw, X, Calendar } from "lucide-react";
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
  due_date?: string;
  priority: string;
  effort: number;
  status: string;
  project_id: string;
  created_at?: string;
  effective_due_date: string;
}

interface PendingTasksProps {
  onTaskReassigned: () => void;
}

const pendingTasksService = {
  getHeaders() {
    const token = Cookies.get('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  },

  async fetchAllTasks(): Promise<any[]> {
    try {
      const tasksResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
        headers: this.getHeaders()
      });
      
      if (!tasksResponse.ok) {
        throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
      }
      
      const tasksResult = await tasksResponse.json();
      
      let allTasks = [];
      if (Array.isArray(tasksResult)) {
        allTasks = tasksResult;
      } else if (tasksResult && Array.isArray(tasksResult.data)) {
        allTasks = tasksResult.data;
      } else if (tasksResult && tasksResult.data && Array.isArray(tasksResult.data.data)) {
        allTasks = tasksResult.data.data;
      } else if (tasksResult && tasksResult.data && typeof tasksResult.data === 'object') {
        allTasks = [tasksResult.data];
      } else {
        allTasks = [];
      }
      
      return allTasks;

    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  },

  async fetchPendingTasks(userId: string): Promise<PendingTask[]> {
    try {
      const allTasks = await this.fetchAllTasks();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pendingTasks = allTasks.filter((task: any) => {
        const isIncomplete = task.status === 'todo' || task.status === 'in-progress';
        
        if (!isIncomplete) {
          return false;
        }

        let effectiveDueDate: Date;

        if (task.due_date) {
          effectiveDueDate = new Date(task.due_date);
        } else if (task.created_at) {
          effectiveDueDate = new Date(task.created_at);
          effectiveDueDate.setDate(effectiveDueDate.getDate() + 1);
        } else {
          return false;
        }

        effectiveDueDate.setHours(0, 0, 0, 0);
        const isOverdue = effectiveDueDate < today;

        return isOverdue;
      });

      if (pendingTasks.length === 0) {
        return [];
      }

      const pendingTasksWithProjectNames = await Promise.all(
        pendingTasks.map(async (task: any) => {
          try {
            let projectName = "Unknown Project";
            
            if (task.project_id) {
              const projectResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/projects/by-id/${task.project_id}`,
                { headers: this.getHeaders() }
              );
              
              if (projectResponse.ok) {
                const projectData = await projectResponse.json();
                projectName = projectData.name || projectData.data?.name || "Unknown Project";
              }
            }

            let effectiveDueDate: string;
            if (task.due_date) {
              effectiveDueDate = task.due_date;
            } else if (task.created_at) {
              const createdDate = new Date(task.created_at);
              createdDate.setDate(createdDate.getDate() + 1);
              effectiveDueDate = createdDate.toISOString().split('T')[0];
            } else {
              effectiveDueDate = new Date().toISOString().split('T')[0];
            }
            
            return {
              id: task.id,
              title: task.title,
              project_name: projectName,
              due_date: task.due_date,
              priority: task.priority || 'medium',
              effort: task.effort || 1,
              status: task.status,
              project_id: task.project_id,
              created_at: task.created_at,
              effective_due_date: effectiveDueDate
            };
          } catch (error) {
            console.error(`Error fetching project for task ${task.id}:`, error);
            return {
              id: task.id,
              title: task.title,
              project_name: "Unknown Project",
              due_date: task.due_date,
              priority: task.priority || 'medium',
              effort: task.effort || 1,
              status: task.status,
              project_id: task.project_id,
              created_at: task.created_at,
              effective_due_date: task.due_date || new Date().toISOString().split('T')[0]
            };
          }
        })
      );

      const sortedTasks = pendingTasksWithProjectNames.sort((a, b) => 
        new Date(a.effective_due_date).getTime() - new Date(b.effective_due_date).getTime()
      );

      return sortedTasks;

    } catch (error) {
      console.error('Error in fetchPendingTasks:', error);
      return [];
    }
  },

  async reassignTaskToToday(taskId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/id/${taskId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ 
        due_date: today,
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
      console.error('Error in fetchPendingTasks:', error);
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
    try {
      const date = new Date(dateString);
      // Format: DD/MM/YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'Invalid date';
    }
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
          className="text-foreground hover:text-primary-foreground"
        >
          {showPending ? "Hide" : "Show"}
        </Button>
      </div>

      {showPending && (
        <div className="space-y-3">
          {pendingTasks.map((task) => (
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
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Due: {formatDate(task.effective_due_date)}</span>
                  <Badge 
                    variant={getPriorityBadgeVariant(task.priority)}
                    className="text-xs"
                  >
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getEffortText(task.effort)}
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
          ))}
        </div>
      )}
    </Card>
  );
};