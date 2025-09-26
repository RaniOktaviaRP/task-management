import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

interface WeeklyGoal {
  id: string;
  name: string;
  confidence: number;
  trend: "up" | "down" | "stable";
}

export function WeeklyGoals() {
  const { projects } = useProjects();
  
  // Convert projects to weekly goals format
  const goals: WeeklyGoal[] = projects.slice(0, 3).map(project => ({
    id: project.id,
    name: project.description || project.name,
    confidence: project.confidence,
    trend: project.trend
  }));
  return (
    <Card className="p-4 bg-gradient-subtle border border-border shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">3 goals for this week</h2>
        <Badge variant="outline" className="text-xs">Week 35</Badge>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {goals.map((goal) => (
          <Badge
            key={goal.id}
            variant="secondary"
            className="px-3 py-1.5 bg-card border border-border shadow-sm hover:shadow-soft transition-all duration-200 cursor-pointer"
          >
            <span className="text-sm">{goal.name}</span>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs font-medium">{goal.confidence}%</span>
              {goal.trend === "up" && <TrendingUp className="w-3 h-3 text-success" />}
              {goal.trend === "down" && <TrendingDown className="w-3 h-3 text-destructive" />}
              {goal.trend === "stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
            </div>
          </Badge>
        ))}
      </div>
    </Card>
  );
}

