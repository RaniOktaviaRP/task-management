import { useState } from "react";
import { Task, TaskCard } from "@/components/TaskCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Users, FolderOpen, Tag, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskGroupsProps {
  tasks: Task[];
  isMiddayMode?: boolean;
  isEODMode?: boolean;
  isCarryoverMode?: boolean;
  isReadOnly?: boolean;
  isGuest?: boolean;
  onStatusChange?: (taskId: string, status: string) => void;
  onMiddayUpdate?: (taskId: string, status: "on-track" | "at-risk" | "blocked") => void;
  onEODUpdate?: (taskId: string, outcome: "done" | "partial" | "not-started", deliverable?: string, bottleneck?: string) => void;
  onCarryoverUpdate?: (taskId: string, progress: string) => void;
  onSaveDetails?: (taskId: string, deliverable: string, bottleneck: string, progress?: string) => void;
  onDelete?: (taskId: string) => void;
  onContinueTomorrow?: (taskId: string, progress: string) => void;
}

type GroupByOption = "client" | "project" | "category" | "priority" | "status" | "none";

const groupIcons = {
  client: Users,
  project: FolderOpen,
  category: Tag,
  priority: AlertTriangle,
  status: Calendar,
  none: FolderOpen
};

export function TaskGroups({
  tasks,
  isMiddayMode = false,
  isEODMode = false,
  isCarryoverMode = false,
  isReadOnly = false,
  isGuest = false,
  onStatusChange,
  onMiddayUpdate,
  onEODUpdate,
  onCarryoverUpdate,
  onSaveDetails,
  onDelete,
  onContinueTomorrow
}: TaskGroupsProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>("project");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["All Projects"]));
  const [expandedTaskDetails, setExpandedTaskDetails] = useState<Set<string>>(new Set());

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleTaskDetails = (taskId: string) => {
    const newExpanded = new Set(expandedTaskDetails);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTaskDetails(newExpanded);
  };

  const getGroupKey = (task: Task): string => {
    switch (groupBy) {
      case "client":
        return task.client || "No Client";
      case "project":
        return task.project || "No Project";
      case "category":
        return task.category || "Uncategorized";
      case "priority":
        return task.priority;
      case "status":
        return task.status;
      default:
        return "All Tasks";
    }
  };

  const getGroupColor = (groupKey: string, groupType: GroupByOption): string => {
    switch (groupType) {
      case "priority":
        if (groupKey === "High") return "border-l-red-500 bg-red-50/50";
        if (groupKey === "Med") return "border-l-yellow-500 bg-yellow-50/50";
        return "border-l-green-500 bg-green-50/50";
      case "status":
        if (groupKey === "completed") return "border-l-green-500 bg-green-50/50";
        if (groupKey === "in-progress") return "border-l-blue-500 bg-blue-50/50";
        if (groupKey === "blocked") return "border-l-red-500 bg-red-50/50";
        return "border-l-gray-500 bg-gray-50/50";
      default:
        return "border-l-primary bg-primary/5";
    }
  };

  // Group tasks
  const groupedTasks = tasks.reduce((groups, task) => {
    const groupKey = getGroupKey(task);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(task);
    return groups;
  }, {} as Record<string, Task[]>);

  // Sort groups by name and sort tasks within each group
  const sortedGroups = Object.entries(groupedTasks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupKey, groupTasks]) => [
      groupKey,
      groupTasks.sort((a, b) => {
        // Sort by priority first, then by title
        const priorityOrder = { "High": 3, "Med": 2, "Low": 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        return a.title.localeCompare(b.title);
      })
    ] as [string, Task[]]);

  if (groupBy === "none") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Label className="text-sm font-medium text-foreground">Group by:</Label>
          <Select value={groupBy} onValueChange={(value: GroupByOption) => setGroupBy(value)}>
            <SelectTrigger className="w-48 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-lg z-50">
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-3">
          {tasks
            .sort((a, b) => {
              const priorityOrder = { "High": 3, "Med": 2, "Low": 1 };
              const aPriority = priorityOrder[a.priority] || 0;
              const bPriority = priorityOrder[b.priority] || 0;
              if (aPriority !== bPriority) return bPriority - aPriority;
              return a.title.localeCompare(b.title);
            })
            .map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isMiddayMode={isMiddayMode}
                isEODMode={isEODMode}
                isCarryoverMode={isCarryoverMode}
                isReadOnly={isReadOnly}
                isGuest={isGuest}
                showDetails={expandedTaskDetails.has(task.id)}
                onStatusChange={onStatusChange}
                onMiddayUpdate={onMiddayUpdate}
                onEODUpdate={onEODUpdate}
                onCarryoverUpdate={onCarryoverUpdate}
                onSaveDetails={onSaveDetails}
                onDelete={onDelete}
                onToggleDetails={() => toggleTaskDetails(task.id)}
                onContinueTomorrow={onContinueTomorrow}
              />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Label className="text-sm font-medium text-foreground">Group by:</Label>
        <Select value={groupBy} onValueChange={(value: GroupByOption) => setGroupBy(value)}>
          <SelectTrigger className="w-48 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border shadow-lg z-50">
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (expandedGroups.size === sortedGroups.length) {
              setExpandedGroups(new Set());
            } else {
              setExpandedGroups(new Set(sortedGroups.map(([groupKey]) => groupKey)));
            }
          }}
          className="text-xs"
        >
          {expandedGroups.size === sortedGroups.length ? "Collapse All" : "Expand All"}
        </Button>
      </div>

      <div className="space-y-3">
        {sortedGroups.map(([groupKey, groupTasks]) => {
          const IconComponent = groupIcons[groupBy];
          const isExpanded = expandedGroups.has(groupKey);
          const groupColor = getGroupColor(groupKey, groupBy);

          return (
            <Card key={groupKey} className={`border-l-4 ${groupColor} bg-card shadow-card`}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(groupKey)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{groupKey}</h3>
                        <p className="text-sm text-muted-foreground">
                          {groupTasks.length} task{groupTasks.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {groupTasks.filter(t => t.status === 'completed').length} completed
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {groupTasks.filter(t => t.status === 'in-progress').length} in progress
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    {groupTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isMiddayMode={isMiddayMode}
                        isEODMode={isEODMode}
                        isCarryoverMode={isCarryoverMode}
                        isReadOnly={isReadOnly}
                        isGuest={isGuest}
                        showDetails={expandedTaskDetails.has(task.id)}
                        onStatusChange={onStatusChange}
                        onMiddayUpdate={onMiddayUpdate}
                        onEODUpdate={onEODUpdate}
                        onCarryoverUpdate={onCarryoverUpdate}
                        onSaveDetails={onSaveDetails}
                        onDelete={onDelete}
                        onToggleDetails={() => toggleTaskDetails(task.id)}
                        onContinueTomorrow={onContinueTomorrow}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}