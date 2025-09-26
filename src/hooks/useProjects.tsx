import { useState, useEffect } from "react";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  effort: number;
  difficulty_level?: string;
  deliverable?: string;
  bottleneck?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  confidence: number;
  trend: "up" | "down" | "stable";
  created_at: string;
  updated_at: string;
  user_id?: string;
  tasks: Task[];
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log("Fetching projects...");

      // Fetch projects
      const projectsRes = await fetch("http://localhost:3000/api/projects");
      if (!projectsRes.ok) throw new Error("Failed to fetch projects");
      const projectsData: Project[] = await projectsRes.json();

      // Fetch tasks
      const tasksRes = await fetch("http://localhost:3000/api/tasks");
      if (!tasksRes.ok) throw new Error("Failed to fetch tasks");
      const tasksData: Task[] = await tasksRes.json();

      // Gabungkan projects + tasks
      const projectsWithTasks: Project[] = projectsData.map((project) => ({
        ...project,
        trend: project.trend as "up" | "down" | "stable",
        tasks: tasksData
          .filter((task) => task.project_id === project.id)
          .map((task) => ({
            ...task,
            status: task.status as "todo" | "in-progress" | "completed",
            priority: task.priority as "low" | "medium" | "high",
          })),
      }));

      console.log("Final projects with tasks:", projectsWithTasks);
      setProjects(projectsWithTasks);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/projects/${projectId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete project");
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          tasks: p.tasks.filter((t) => t.id !== taskId),
        }))
      );
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchProjects();

    // â›” Tanpa Supabase realtime.
    // Kalau mau realtime, harus pakai WebSocket/Server-Sent Events dari backend.

  }, []);

  const totalTasks = projects.reduce(
    (acc, project) => acc + project.tasks.length,
    0
  );
  const completedTasks = projects.reduce(
    (acc, project) =>
      acc + project.tasks.filter((task) => task.status === "completed").length,
    0
  );
  const inProgressTasks = projects.reduce(
    (acc, project) =>
      acc + project.tasks.filter((task) => task.status === "in-progress").length,
    0
  );

  return {
    projects,
    loading,
    totalTasks,
    completedTasks,
    inProgressTasks,
    deleteProject,
    deleteTask,
    refetch: fetchProjects,
  };
};


