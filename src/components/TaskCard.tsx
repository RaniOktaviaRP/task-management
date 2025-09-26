import { useState } from "react";
import { Check, Clock, AlertTriangle, X, Upload, Link2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
export interface Task {
  id: string;
  title: string;
  project: string;
  goal: string;
  effort: "S" | "M" | "L";
  priority: "Low" | "Med" | "High";
  status: "todo" | "in-progress" | "completed" | "blocked";
  difficulty?: string;
  middayStatus?: "on-track" | "at-risk" | "blocked";
  eodOutcome?: "done" | "partial" | "not-started";
  deliverable?: string;
  bottleneck?: string;
  progress?: string;
  continueTomorrow?: boolean;
}
interface TaskCardProps {
  task: Task;
  isMiddayMode?: boolean;
  isEODMode?: boolean;
  isCarryoverMode?: boolean;
  isReadOnly?: boolean;
  showDetails?: boolean;
  onStatusChange?: (taskId: string, status: string) => void;
  onMiddayUpdate?: (taskId: string, status: "on-track" | "at-risk" | "blocked") => void;
  onEODUpdate?: (taskId: string, outcome: "done" | "partial" | "not-started", deliverable?: string, bottleneck?: string) => void;
  onCarryoverUpdate?: (taskId: string, progress: string) => void;
  onSaveDetails?: (taskId: string, deliverable: string, bottleneck: string, progress?: string) => void;
  onDelete?: (taskId: string) => void;
  onToggleDetails?: () => void;
  onContinueTomorrow?: (taskId: string, progress: string) => void;
}
export function TaskCard({
  task,
  isMiddayMode = false,
  isEODMode = false,
  isCarryoverMode = false,
  isReadOnly = false,
  showDetails = false,
  onStatusChange,
  onMiddayUpdate,
  onEODUpdate,
  onCarryoverUpdate,
  onSaveDetails,
  onDelete,
  onToggleDetails,
  onContinueTomorrow
}: TaskCardProps) {
  const [deliverable, setDeliverable] = useState(task.deliverable || "");
  const [bottleneck, setBottleneck] = useState(task.bottleneck || "");
  const [progress, setProgress] = useState(task.progress || "");
  const [showProgressField, setShowProgressField] = useState(false);
  const effortMap = {
    S: {
      label: "30m",
      color: "bg-success/10 text-success"
    },
    M: {
      label: "60m",
      color: "bg-warning/10 text-warning"
    },
    L: {
      label: "120m",
      color: "bg-destructive/10 text-destructive"
    }
  };
  const priorityColors = {
    Low: "bg-muted text-muted-foreground",
    Med: "bg-warning/10 text-warning",
    High: "bg-destructive/10 text-destructive"
  };
  return <Card className="p-4 bg-card border border-border shadow-card hover:shadow-soft transition-all duration-200">
      <div className="flex items-start gap-3">
        {/* Status Selector */}
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => onStatusChange?.(task.id, "todo")} 
            className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200", 
              task.status === "todo" ? "bg-muted border-muted-foreground" : "border-border hover:border-primary"
            )}
            title="Todo"
          >
            {task.status === "todo" && <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
          </button>
          <button 
            onClick={() => onStatusChange?.(task.id, "in-progress")} 
            className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200", 
              task.status === "in-progress" ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
            )}
            title="In Progress"
          >
            {task.status === "in-progress" && <Clock className="w-3 h-3" />}
          </button>
          <button 
            onClick={() => onStatusChange?.(task.id, "completed")} 
            className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200", 
              task.status === "completed" ? "bg-gradient-success border-success text-success-foreground" : "border-border hover:border-primary"
            )}
            title="Completed"
          >
            {task.status === "completed" && <Check className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex-1 space-y-3">
          {/* Task Header */}
          <div>
            <h3 className={cn("font-medium text-foreground", task.status === "completed" && "line-through text-muted-foreground")}>
              {task.title}
            </h3>
            
            {/* Chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                ðŸ“‹ {task.project}
              </Badge>
              <Badge variant="outline" className="text-xs">
                ðŸŽ¯ {task.goal}
              </Badge>
              {task.continueTomorrow && (
                <Badge className="bg-warning/20 text-warning text-xs">
                  ðŸ“… Continue Tomorrow
                </Badge>
              )}
            </div>
          </div>

          {/* Midday Checkpoint */}
          {isMiddayMode && <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium text-foreground">Midday Check âœ¨</h4>
              <div className="flex gap-2 flex-wrap">
                {["on-track", "at-risk", "blocked"].map(status => <Button key={status} variant={task.middayStatus === status ? "default" : "outline"} size="sm" onClick={() => onMiddayUpdate?.(task.id, status as any)} className={cn("text-xs", status === "on-track" && task.middayStatus === status && "bg-gradient-success", status === "at-risk" && task.middayStatus === status && "bg-warning text-warning-foreground", status === "blocked" && task.middayStatus === status && "bg-destructive text-destructive-foreground")}>
                    {status === "on-track" && "â¦¿ On track"}
                    {status === "at-risk" && "âš  At risk"}
                    {status === "blocked" && "ðŸš« Blocked"}
                  </Button>)}
                {onContinueTomorrow && !task.continueTomorrow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Continue Tomorrow button clicked for task:', task.id);
                      setShowProgressField(true);
                    }}
                    className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                  >
                    ðŸ“… Continue Tomorrow
                  </Button>
                )}
                {/* Show Edit Progress button if task is already marked to continue tomorrow */}
                {onContinueTomorrow && task.continueTomorrow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Edit Progress clicked for task:', task.id);
                      setShowProgressField(true);
                    }}
                    className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                  >
                    âœï¸ Edit Progress
                  </Button>
                )}
              </div>
            </div>}

          {/* EOD Review */}
          {isEODMode && <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Victory lap ðŸ</h4>
              
              {/* Outcome buttons */}
              <div className="flex gap-2 flex-wrap">
                {["done", "partial", "not-started"].map(outcome => <Button key={outcome} variant={task.eodOutcome === outcome ? "default" : "outline"} size="sm" onClick={() => onEODUpdate?.(task.id, outcome as any, deliverable, bottleneck)} className={cn("text-xs", outcome === "done" && task.eodOutcome === outcome && "bg-gradient-success", outcome === "partial" && task.eodOutcome === outcome && "bg-warning text-warning-foreground", outcome === "not-started" && task.eodOutcome === outcome && "bg-destructive text-destructive-foreground")}>
                    {outcome === "done" && "âœ… Done"}
                    {outcome === "partial" && "âš¡ Partial"}
                    {outcome === "not-started" && "âŒ Not started"}
                  </Button>)}
                {onContinueTomorrow && !task.continueTomorrow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Continue Tomorrow button clicked for task (EOD):', task.id);
                      setShowProgressField(true);
                    }}
                    className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                  >
                    ðŸ“… Continue Tomorrow
                  </Button>
                )}
                {/* Show Edit Progress button if task is already marked to continue tomorrow */}
                {onContinueTomorrow && task.continueTomorrow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Edit Progress clicked for task (EOD):', task.id);
                      setShowProgressField(true);
                    }}
                    className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                  >
                    âœï¸ Edit Progress
                  </Button>
                )}
              </div>
            </div>}

          {/* Carryover Mode */}
          {isCarryoverMode && <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Continue Tomorrow ðŸ“…</h4>
              <div>
                <label className="text-sm font-medium text-foreground">Progress & Obstacles</label>
                <textarea 
                  placeholder="What obstacles prevented completion? What progress was made?" 
                  value={progress} 
                  onChange={e => setProgress(e.target.value)} 
                  className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none" 
                  rows={3} 
                />
                <Button 
                  onClick={() => onCarryoverUpdate?.(task.id, progress)}
                  size="sm"
                  className="w-full mt-2"
                >
                  Save Progress
                </Button>
              </div>
            </div>}

           {/* Continue Tomorrow Progress Field */}
           {showProgressField && (isMiddayMode || isEODMode) && (
             <div className="bg-warning/10 rounded-lg p-3 space-y-3">
               <h4 className="text-sm font-medium text-foreground">Continue Tomorrow Progress ðŸ“…</h4>
               <div>
                 <label className="text-sm font-medium text-foreground">What will you continue tomorrow?</label>
                 <textarea 
                   placeholder="Describe what you'll continue working on tomorrow..." 
                   value={progress} 
                   onChange={e => setProgress(e.target.value)} 
                   className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none" 
                   rows={3} 
                 />
                 <Button 
                   onClick={() => {
                     console.log('Save Continue Tomorrow clicked', { taskId: task.id, progress });
                     onContinueTomorrow?.(task.id, progress);
                     setShowProgressField(false);
                   }}
                   size="sm"
                   className="w-full mt-2"
                 >
                   Save & Continue Tomorrow
                 </Button>
               </div>
             </div>
           )}

           {/* Details Section - Only show when showDetails is true or not in overview mode */}
          {(showDetails || isMiddayMode || isEODMode || isCarryoverMode) && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Deliverable</label>
                  {isReadOnly ? (
                    <p className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[40px]">
                      {task.deliverable || "No deliverable specified"}
                    </p>
                  ) : (
                    <textarea 
                      placeholder="What was delivered for this task?" 
                      value={deliverable} 
                      onChange={e => setDeliverable(e.target.value)} 
                      className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none" 
                      rows={2} 
                    />
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Bottleneck</label>
                  {isReadOnly ? (
                    <p className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[40px]">
                      {task.bottleneck || "No bottlenecks reported"}
                    </p>
                  ) : (
                    <textarea 
                      placeholder="What blocked or slowed you down?" 
                      value={bottleneck} 
                      onChange={e => setBottleneck(e.target.value)} 
                      className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none" 
                      rows={2} 
                    />
                  )}
                </div>
                 {task.progress && (
                   <div>
                     <label className="text-sm font-medium text-foreground">
                       {task.continueTomorrow ? "Continue Tomorrow Progress" : "Progress Notes"}
                     </label>
                     <p className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[40px]">
                       {task.progress}
                     </p>
                   </div>
                 )}
                {!isReadOnly && onSaveDetails && (
                  <Button 
                    onClick={() => {
                      console.log('Save button clicked', { taskId: task.id, deliverable, bottleneck, progress });
                      onSaveDetails(task.id, deliverable, bottleneck, progress);
                    }}
                    size="sm"
                    className="w-full"
                  >
                    Save Details
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* View Details Toggle for Overview Mode */}
          {!isMiddayMode && !isEODMode && !isCarryoverMode && !showDetails && onToggleDetails && (
            <Button 
              onClick={onToggleDetails}
              variant="outline"
              size="sm"
              className="w-full"
            >
              View Details
            </Button>
          )}
        </div>

        {/* Actions and Status indicator */}
        <div className="flex flex-col items-center gap-2">
          {onDelete && !isReadOnly && (
            <button 
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className={cn("w-2 h-2 rounded-full", task.status === "completed" && "bg-success", task.status === "in-progress" && "bg-primary animate-pulse-glow", task.status === "blocked" && "bg-destructive", task.status === "todo" && "bg-muted-foreground")} />
        </div>
      </div>
    </Card>;
}

