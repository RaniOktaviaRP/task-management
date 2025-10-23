"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import Cookies from "js-cookie";

// Types
interface Task {
  id: string;
  title: string;
  effort: number; // 1 = S (0.5h), 2 = M (1h), 3 = L (2h)
  status: string;
}

interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

// API service for capacity data
const capacityService = {
  getHeaders() {
    const token = Cookies.get("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  },

  async fetchProjects(): Promise<Project[]> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }

    const projects = await response.json();

    // Fetch tasks for each project
    const projectsWithTasks = await Promise.all(
      projects.map(async (project: Project) => {
        try {
          const tasksResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/tasks/project/${project.id}`,
            { headers: this.getHeaders() }
          );

          if (tasksResponse.ok) {
            const tasks = await tasksResponse.json();
            return { ...project, tasks };
          }
          return { ...project, tasks: [] };
        } catch (error) {
          return { ...project, tasks: [] };
        }
      })
    );

    return projectsWithTasks;
  },
};

// Custom hook untuk projects data
const useProjectsData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await capacityService.fetchProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Calculate metrics
  const totalTasks = projects.reduce(
    (total, project) => total + project.tasks.length,
    0
  );

  const completedTasks = projects.reduce(
    (total, project) =>
      total +
      project.tasks.filter((task) => task.status === "completed").length,
    0
  );

  const plannedHours = projects.reduce((total, project) => {
    return (
      total +
      project.tasks.reduce((taskTotal, task) => {
        const hours = task.effort === 1 ? 0.5 : task.effort === 2 ? 1 : 2;
        return taskTotal + hours;
      }, 0)
    );
  }, 0);

  return {
    projects,
    loading,
    error,
    totalTasks,
    completedTasks,
    plannedHours,
    refetch: fetchProjects,
  };
};

export function CapacityBar() {
  const { projects, loading, totalTasks, completedTasks, plannedHours } =
    useProjectsData();

  // Calculate capacity based on actual data
  const plannedTasks = totalTasks;
  const totalCapacity = 8; // Could be configurable
  const totalHours = 8; // Standard work day

  const progressPercentage =
    totalCapacity > 0 ? Math.min((plannedTasks / totalCapacity) * 100, 100) : 0;
  const hoursPercentage =
    totalHours > 0 ? Math.min((plannedHours / totalHours) * 100, 100) : 0;

  if (loading) {
    return (
      <Card className="p-4 bg-card border border-border shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">
              Today's capacity
            </span>
          </div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
        <Progress value={0} className="h-2 bg-muted" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Loading data...</span>
          <span>0% planned</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border border-border shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">Today's capacity</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {plannedTasks}/{totalCapacity} tasks • {plannedHours.toFixed(1)}h/
          {totalHours}h
        </span>
      </div>

      {/* Tasks Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Tasks</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2 bg-muted mb-2" />
      </div>

      {/* Hours Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Hours</span>
          <span>{Math.round(hoursPercentage)}%</span>
        </div>
        <Progress value={hoursPercentage} className="h-2 bg-muted" />
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>
          Completed: {completedTasks}/{plannedTasks} tasks
        </span>
        <span
          className={
            plannedHours > totalHours ? "text-warning" : "text-success"
          }
        >
          {plannedHours > totalHours ? "Over capacity" : "Within capacity"}
        </span>
      </div>
    </Card>
  );
}
