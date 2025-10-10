import { useState, useEffect } from "react";
import Cookies from "js-cookie";

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
  progress?: string;
  continue_tomorrow?: boolean;
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
  if (response && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return [response.data];
  }
  console.warn("Unable to extract array data from response:", response);
  return [];
};

// Helper function untuk validasi task
const isValidTask = (task: any): task is Task => {
  return (
    task &&
    typeof task === 'object' &&
    task.id &&
    task.project_id &&
    typeof task.title === 'string'
  );
};

// Helper function untuk validasi project
const isValidProject = (project: any): project is Project => {
  return (
    project &&
    typeof project === 'object' &&
    project.id &&
    typeof project.name === 'string'
  );
};

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching projects...");

      const headers = getHeaders();

      // Selalu gunakan endpoint general /projects
      const projectsUrl = `${process.env.NEXT_PUBLIC_API_URL}/projects`;
      
      console.log("Fetching projects from:", projectsUrl);
      
      const projectsRes = await fetch(projectsUrl, {
        headers,
        // Tambahkan timeout untuk menghindari hanging request
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!projectsRes.ok) {
        if (projectsRes.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        if (projectsRes.status === 404) {
          console.log("Projects endpoint not found, returning empty array");
          setProjects([]);
          return;
        }
        throw new Error(`Failed to fetch projects: ${projectsRes.status} ${projectsRes.statusText}`);
      }
      
      const projectsResponse = await projectsRes.json();
      console.log("Projects API response:", projectsResponse);
      
      const projectsData = extractDataFromResponse(projectsResponse);
      console.log("Extracted projects data:", projectsData);

      await processProjectsData(projectsData);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      
      // Handle specific error types
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        setError("Request timeout - Please check your connection");
      } else if (error.message.includes('Failed to fetch')) {
        setError("Network error - Please check if the server is running");
      } else {
        setError(error.message || "An error occurred while fetching projects");
      }
      
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const processProjectsData = async (projectsData: any[]) => {
    if (!Array.isArray(projectsData)) {
      console.error("Projects data is not an array:", projectsData);
      setProjects([]);
      return;
    }

    // Filter dan validasi projects
    const validProjects = projectsData.filter(isValidProject);
    console.log("Valid projects:", validProjects);

    if (validProjects.length === 0) {
      console.warn("No valid projects found");
      setProjects([]);
      return;
    }

    // Fetch tasks untuk semua project
    let tasksData: any[] = [];
    
    try {
      const headers = getHeaders();
      const tasksUrl = `${process.env.NEXT_PUBLIC_API_URL}/tasks`;
      console.log("Fetching tasks from:", tasksUrl);
      
      const tasksRes = await fetch(tasksUrl, {
        headers,
        signal: AbortSignal.timeout(10000)
      });
      
      if (tasksRes.ok) {
        const tasksResponse = await tasksRes.json();
        console.log("Tasks API response:", tasksResponse);
        
        tasksData = extractDataFromResponse(tasksResponse);
        console.log("Extracted tasks data:", tasksData);
      } else {
        console.warn("Failed to fetch tasks, continuing with empty tasks");
      }
    } catch (taskError: any) {
      console.warn("Error fetching tasks, continuing with empty tasks:", taskError);
    }

    // Filter dan validasi tasks
    const validTasks = (Array.isArray(tasksData) ? tasksData : [])
      .filter(task => task != null)
      .filter(isValidTask);
    
    console.log("Valid tasks:", validTasks);

    // Group tasks by project_id
    const tasksByProjectId: { [key: string]: Task[] } = {};
    validTasks.forEach(task => {
      if (!tasksByProjectId[task.project_id]) {
        tasksByProjectId[task.project_id] = [];
      }
      tasksByProjectId[task.project_id].push({
        ...task,
        status: (task.status as "todo" | "in-progress" | "completed") || "todo",
        priority: (task.priority as "low" | "medium" | "high") || "medium",
        effort: task.effort || 1,
      });
    });

    // Gabungkan projects + tasks
    const projectsWithTasks: Project[] = validProjects.map((project) => {
      const projectTasks = tasksByProjectId[project.id] || [];
      
      return {
        ...project,
        trend: (project.trend as "up" | "down" | "stable") || "stable",
        progress: project.progress || 0,
        confidence: project.confidence || 0,
        tasks: projectTasks,
      };
    });

    console.log("Final projects with tasks:", projectsWithTasks);
    setProjects(projectsWithTasks);
  };

  const deleteProject = async (projectId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/by-id/${projectId}`,
        { 
          method: "DELETE",
          headers
        }
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error("Failed to delete project");
      }
      
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/id/${taskId}`, 
        {
          method: "DELETE",
          headers
        }
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error("Failed to delete task");
      }
      
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

  const createProject = async (projectData: Omit<Project, "id" | "created_at" | "updated_at" | "tasks">) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: "POST",
        headers,
        body: JSON.stringify(projectData),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error("Failed to create project");
      }
      
      const newProject = await res.json();
      const extractedProject = extractDataFromResponse(newProject)[0] || newProject;
      
      if (isValidProject(extractedProject)) {
        setProjects((prev) => [...prev, { ...extractedProject, tasks: [] }]);
        return extractedProject;
      } else {
        throw new Error("Invalid project data received from server");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  };

  const updateProject = async (projectId: string, projectData: Partial<Project>) => {
    try {
      const headers = getHeaders();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/by-id/${projectId}`, 
        {
          method: "PUT",
          headers,
          body: JSON.stringify(projectData),
        }
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error("Failed to update project");
      }
      
      const updatedProject = await res.json();
      const extractedProject = extractDataFromResponse(updatedProject)[0] || updatedProject;
      
      if (isValidProject(extractedProject)) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...extractedProject, tasks: p.tasks } : p))
        );
        return extractedProject;
      } else {
        throw new Error("Invalid project data received from server");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  };

  const createTask = async (taskData: Omit<Task, "id" | "created_at" | "updated_at">) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify(taskData),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error("Failed to create task");
      }
      
      const newTask = await res.json();
      const extractedTask = extractDataFromResponse(newTask)[0] || newTask;
      
      if (isValidTask(extractedTask)) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === taskData.project_id
              ? { ...p, tasks: [...p.tasks, extractedTask] }
              : p
          )
        );
        return extractedTask;
      } else {
        throw new Error("Invalid task data received from server");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const headers = getHeaders();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/id/${taskId}`, 
        {
          method: "PUT",
          headers,
          body: JSON.stringify(taskData),
        }
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error("Failed to update task");
      }
      
      const updatedTask = await res.json();
      const extractedTask = extractDataFromResponse(updatedTask)[0] || updatedTask;
      
      if (isValidTask(extractedTask)) {
        setProjects((prev) =>
          prev.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) => (t.id === taskId ? extractedTask : t)),
          }))
        );
        return extractedTask;
      } else {
        throw new Error("Invalid task data received from server");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const getTasksByProject = async (projectId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/project/${projectId}`, 
        {
          headers
        }
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error("Failed to fetch tasks by project");
      }
      
      const response = await res.json();
      const tasksData = extractDataFromResponse(response);
      return tasksData.filter((task: any) => task != null).filter(isValidTask);
    } catch (error) {
      console.error("Error fetching tasks by project:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []); // Hapus dependency pada userId

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
    error,
    totalTasks,
    completedTasks,
    inProgressTasks,
    // CRUD operations
    deleteProject,
    deleteTask,
    createProject,
    updateProject,
    createTask,
    updateTask,
    getTasksByProject,
    refetch: fetchProjects,
  };
};