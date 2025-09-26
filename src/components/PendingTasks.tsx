"use client";

import { useState, useEffect } from "react";
import { Clock, RotateCcw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

export const PendingTasks = ({ onTaskReassigned }: PendingTasksProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);

  const fetchPendingTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/tasks?userId=${user.id}&status=pending`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to fetch pending tasks");

      const data: PendingTask[] = await res.json();
      setPendingTasks(data);
    } catch (error) {
      console.error("Error fetching pending tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
  }, [user]);

  const reassignToToday = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/reassign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_date: new Date().toISOString().split("T")[0],
          status: "todo",
        }),
      });

      if (!res.ok) throw new Error("Failed to reassign task");

      setPendingTasks((prev) => prev.filter((task) => task.id !== taskId));
      onTaskReassigned();
      toast({
        title: "Task reassigned",
        description: "Task has been moved to today's schedule.",
      });
    } catch (error) {
      console.error("Error reassigning task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reassign task.",
      });
    }
  };

  const markAsCompleted = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) throw new Error("Failed to complete task");

      setPendingTasks((prev) => prev.filter((task) => task.id !== taskId));
      onTaskReassigned();
      toast({
        title: "Task completed",
        description: "Task has been marked as completed.",
      });
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete task.",
      });
    }
  };

  if (loading) return null;
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
        >
          {showPending ? "Hide" : "Show"}
        </Button>
      </div>

      {showPending && (
        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {task.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {task.project_name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                  <Badge
                    variant={
                      task.priority === "high" ? "destructive" : "secondary"
                    }
                    className="text-xs"
                  >
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {task.effort === 1
                      ? "S"
                      : task.effort === 2
                      ? "M"
                      : "L"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reassignToToday(task.id)}
                  className="h-8 px-2"
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


