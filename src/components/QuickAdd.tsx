import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Task } from "@/components/TaskCard";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface QuickAddProps {
  onAddTask?: (task: Omit<Task, 'id'>) => void;
  currentMode?: "midday" | "eod" | "carryover";
}

const difficultyLevels = [
  { value: "easy", label: "Easy", color: "bg-blue-100 text-blue-800" },
  { value: "moderate", label: "Moderate", color: "bg-green-100 text-green-800" },
  { value: "challenging", label: "Challenging", color: "bg-yellow-100 text-yellow-800" },
  { value: "hard", label: "Hard", color: "bg-orange-100 text-orange-800" },
  { value: "super_hard", label: "Super Hard", color: "bg-red-100 text-red-800" }
];

export function QuickAdd({ onAddTask, currentMode = "midday" }: QuickAddProps) {
  const { projects } = useProjects();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("moderate");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Check if user is authenticated
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to create tasks.",
      });
      return;
    }
    
    if (!taskText.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Task title is required.",
      });
      return;
    }

    if (!onAddTask) {
      console.error('onAddTask callback is not provided');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse task: "title #project @goal ^effort"
      const parts = taskText.split(/\s+/);
      let title = "";
      let project = projects.length > 0 ? projects[0].name : (user?.email?.split('@')[0] || "Personal");
      let goal = "Complete task";
      let effort: "S" | "M" | "L" = "M";
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('#')) {
          project = part.substring(1);
        } else if (part.startsWith('@')) {
          goal = part.substring(1).replace(/-/g, ' ');
        } else if (part.startsWith('^')) {
          const effortValue = part.substring(1).toUpperCase();
          if (effortValue === 'S' || effortValue === 'M' || effortValue === 'L') {
            effort = effortValue;
          }
        } else if (!part.startsWith('#') && !part.startsWith('@') && !part.startsWith('^')) {
          title += (title ? " " : "") + part;
        }
      }
      
      if (!title) {
        title = taskText; // Fallback to full text if no proper title found
      }

      // Use selected project name if available, otherwise use parsed project
      const finalProjectName = selectedProjectName || project;

      const newTask: Omit<Task, 'id'> = {
        title,
        project: finalProjectName,
        client: undefined,
        category: undefined,
        goal,
        effort,
        priority: "Med",
        status: "todo",
        difficulty: selectedDifficulty,
        taskMode: currentMode
      };
      
      console.log('QuickAdd: Calling onAddTask with:', newTask);
      await onAddTask(newTask);
      
      // Reset form
      setTaskText("");
      setSelectedDifficulty("moderate");
      setSelectedProjectName("");
      setIsExpanded(false);
      
      toast({
        title: "Task Added",
        description: "Task has been created successfully.",
      });
      
    } catch (error) {
      console.error('Error in QuickAdd handleSubmit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTaskClick = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to create tasks.",
      });
      return;
    }
    setIsExpanded(true);
  };

  // Get unique project names
  const projectNames = [...new Set(projects.map(p => p.name))];

  if (!isExpanded) {
    return (
      <Button
        onClick={handleAddTaskClick}
        className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-soft transition-all duration-200"
        disabled={isSubmitting}
      >
        <Plus className="w-4 h-4 mr-2" />
        {isSubmitting ? "Adding..." : "Add task"}
        {!user && " (Login Required)"}
      </Button>
    );
  }

  return (
    <Card className="p-4 bg-card border-2 border-primary shadow-glow">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Quick entry</span>
        </div>
        
        <Input
          autoFocus
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder={`Draft client deck #${projectNames.length > 0 ? projectNames[0].toLowerCase() : 'project'} @goal ^L`}
          className="border-border focus:ring-primary"
          disabled={isSubmitting}
          required
        />

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Project</Label>
          <Input
            value={selectedProjectName}
            onChange={(e) => setSelectedProjectName(e.target.value)}
            placeholder="Project name"
            className="border-border focus:ring-primary"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Difficulty Level</Label>
          <Select 
            value={selectedDifficulty} 
            onValueChange={setSelectedDifficulty}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-lg z-50">
              {difficultyLevels.map((level) => (
                <SelectItem key={level.value} value={level.value} className="cursor-pointer hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${level.color}`}>
                      {level.label}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-xs text-muted-foreground mb-3">
          Format: <code className="bg-muted px-1 rounded">title #project @goal ^effort</code>
          {projectNames.length > 0 && (
            <div className="mt-1">
              Available projects: {projectNames.join(', ')}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
  type="submit" 
  size="sm" 
  className="bg-gradient-primary text-primary-foreground disabled:opacity-100 disabled:pointer-events-none cursor-pointer"
  disabled={isSubmitting || !taskText.trim()}
>
  {isSubmitting ? "Adding..." : "Add task"}
</Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setIsExpanded(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}