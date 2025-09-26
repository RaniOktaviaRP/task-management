'use client';

import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  project: string;
  effort: "S" | "M" | "L";
  status: "todo" | "in-progress" | "completed";
}

interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

interface CapacityBarProps {
  projects?: Project[]; // Jadikan optional dengan tanda ?
}

export function CapacityBar({ projects = [] }: CapacityBarProps) {
  // Berikan default value empty array jika projects undefined
  const safeProjects = projects || [];
  
  // Calculate total tasks and completed tasks
  const totalTasks = safeProjects.reduce((total, project) => total + project.tasks.length, 0);
  const completedTasks = safeProjects.reduce((total, project) => 
    total + project.tasks.filter(task => task.status === "completed").length, 0
  );
  
  // Calculate capacity based on actual data
  const plannedTasks = totalTasks;
  const totalCapacity = 8; // Could be configurable
  const completedTasksCount = completedTasks;
  
  // Calculate hours based on effort (S=0.5h, M=1h, L=2h)
  const plannedHours = safeProjects.reduce((total, project) => {
    return total + project.tasks.reduce((taskTotal, task) => {
      const hours = task.effort === "S" ? 0.5 : task.effort === "M" ? 1 : 2;
      return taskTotal + hours;
    }, 0);
  }, 0);
  
  const totalHours = 8; // Standard work day
  const progressPercentage = totalCapacity > 0 ? (plannedTasks / totalCapacity) * 100 : 0;

  return (
    <Card className="p-4 bg-card border border-border shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">Today's capacity</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {plannedTasks}/{totalCapacity} tasks • {plannedHours.toFixed(1)}h/{totalHours}h
        </span>
      </div>
      
      <Progress 
        value={progressPercentage} 
        className="h-2 bg-muted"
      />
      
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Comfortable load</span>
        <span>{Math.round(progressPercentage)}% planned</span>
      </div>
    </Card>
  );
}