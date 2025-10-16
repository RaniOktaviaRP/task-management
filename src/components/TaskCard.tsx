import { useState, useEffect } from "react";
import {
  Check,
  Clock,
  AlertTriangle,
  X,
  Upload,
  Link2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface Task {
  id: string;
  title: string;
  project: string;
  client?: string;
  category?: string;
  goal: string;
  effort: "S" | "M" | "L";
  priority: "Low" | "Med" | "High";
  status: "todo" | "in-progress" | "completed" | "blocked";
  difficulty?: string;
  taskMode?: "midday" | "eod" | "carryover";
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
  isGuest?: boolean;
  onStatusChange?: (taskId: string, status: string) => void;
  onMiddayUpdate?: (
    taskId: string,
    status: "on-track" | "at-risk" | "blocked"
  ) => void;
  onEODUpdate?: (
    taskId: string,
    outcome: "done" | "partial" | "not-started",
    deliverable?: string,
    bottleneck?: string
  ) => void;
  onCarryoverUpdate?: (taskId: string, progress: string) => void;
  onSaveDetails?: (
    taskId: string,
    deliverable: string,
    bottleneck: string,
    progress?: string
  ) => void;
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
  isGuest = false,
  onStatusChange,
  onMiddayUpdate,
  onEODUpdate,
  onCarryoverUpdate,
  onSaveDetails,
  onDelete,
  onToggleDetails,
  onContinueTomorrow,
}: TaskCardProps) {
  const [deliverable, setDeliverable] = useState(task.deliverable || "");
  const [bottleneck, setBottleneck] = useState(task.bottleneck || "");
  const [progress, setProgress] = useState(task.progress || "");
  const [showProgressField, setShowProgressField] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const effortMap = {
    S: {
      label: "30m",
      color: "bg-success/10 text-success",
    },
    M: {
      label: "60m",
      color: "bg-warning/10 text-warning",
    },
    L: {
      label: "120m",
      color: "bg-destructive/10 text-destructive",
    },
  };

  const priorityColors = {
    Low: "bg-muted text-muted-foreground",
    Med: "bg-warning/10 text-warning",
    High: "bg-destructive/10 text-destructive",
  };

  const [isRecording, setIsRecording] = useState(false);
  const [currentRecognition, setCurrentRecognition] = useState<any>(null);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (currentRecognition) {
        currentRecognition.stop();
      }
    };
  }, [currentRecognition]);

  const stopVoiceInput = () => {
    if (currentRecognition) {
      currentRecognition.stop();
      setCurrentRecognition(null);
      setIsRecording(false);
    }
  };

  const handleVoiceInput = (field: "deliverable" | "progress") => {
    // If already recording, stop it
    if (isRecording) {
      stopVoiceInput();
      return;
    }

    // Stop any existing recognition first
    if (currentRecognition) {
      currentRecognition.stop();
      setCurrentRecognition(null);
      setIsRecording(false);
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition API is not supported in this browser.");
      return;
    }

    // Request microphone permission
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then(() => {
        // Permission granted, start recognition
        startRecognition(field, SpeechRecognition);
      })
      .catch((error) => {
        console.error("Microphone permission denied:", error);
        alert("Microphone permission is required for speech recognition.");
      });
  };

  const startRecognition = (
    field: "deliverable" | "progress",
    SpeechRecognition: any
  ) => {
    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = false;

    setCurrentRecognition(recognition);

    let silenceTimer: NodeJS.Timeout | null = null;

    const stopRecognition = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (recognition) {
        recognition.stop();
      }
      setIsRecording(false);
      setCurrentRecognition(null);
      console.log("Auto stopped due to silence for 8 seconds.");
    };

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(stopRecognition, 8000); // 8 seconds of silence
    };

    recognition.onstart = () => {
      console.log("Voice recognition started.");
      setIsRecording(true);
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log("Voice Result:", transcript);

      if (field === "deliverable") {
        setDeliverable((prev) => (prev ? prev + " " + transcript : transcript));
      } else if (field === "progress") {
        setProgress((prev) => (prev ? prev + " " + transcript : transcript));
      }

      resetSilenceTimer(); // each time speaking is detected, reset the timer
    };

    recognition.onerror = (err: any) => {
      console.error("Speech error:", err);
      console.error("Error type:", err.error);
      console.error("Error message:", err.message);

      // Only show alert for non-aborted errors
      if (err.error !== "aborted" && err.error !== "no-speech") {
        alert(`Speech recognition error: ${err.error}`);
      }

      stopRecognition();
    };

    recognition.onend = () => {
      console.log("Voice recognition ended.");
      if (silenceTimer) clearTimeout(silenceTimer);
      setIsRecording(false);
      setCurrentRecognition(null);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setIsRecording(false);
      setCurrentRecognition(null);
    }
  };

  // Show expanded content when in special modes or when expanded/toggled
  const shouldShowExpandedContent =
    isMiddayMode || isEODMode || isCarryoverMode || isExpanded || showDetails;

  return (
    <Card className="p-4 bg-card border border-border shadow-card hover:shadow-soft transition-all duration-200">
      <div className="flex items-start gap-3">
        {/* Status Selector - Only show for authenticated users */}
        {!isGuest && (
          <div className="flex flex-col gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onStatusChange?.(task.id, "todo")}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                    task.status === "todo"
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  )}
                >
                  {task.status === "todo" && (
                    <div className="w-1 h-1 rounded-full bg-black" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>📝 Todo - Mark task as not started</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onStatusChange?.(task.id, "in-progress")}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                    task.status === "in-progress"
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  )}
                >
                  {task.status === "in-progress" && (
                    <Clock className="w-3 h-3" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>⏰ In Progress - Currently working on this task</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onStatusChange?.(task.id, "completed")}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                    task.status === "completed"
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  )}
                >
                  {task.status === "completed" && <Check className="w-3 h-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>✅ Completed - Task has been finished</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="flex-1 space-y-3">
          {/* Task Header - Always Visible */}
          <div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3
                  className={cn(
                    "font-medium text-foreground",
                    task.status === "completed" &&
                      "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </h3>

                {/* Chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    📋 {task.project}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    🎯 {task.goal}
                  </Badge>
                  {task.taskMode && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-primary/10 text-primary"
                    >
                      {task.taskMode === "midday"
                        ? "⏰ MD"
                        : task.taskMode === "eod"
                        ? "🏁 EOD"
                        : "📅 CO"}
                    </Badge>
                  )}
                  {task.difficulty && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700"
                    >
                      💪{" "}
                      {task.difficulty.charAt(0).toUpperCase() +
                        task.difficulty.slice(1)}
                    </Badge>
                  )}
                  {task.continueTomorrow && (
                    <Badge className="bg-warning/20 text-warning text-xs">
                      📅 Continue Tomorrow
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expand/Collapse Button - Only show in overview mode for authenticated users */}
              {!isMiddayMode && !isEODMode && !isCarryoverMode && !isGuest && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-2"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Expanded Content - Only show when expanded or in special modes */}
          {shouldShowExpandedContent && (
            <div className="space-y-3 border-t border-border pt-3">
              {/* Midday Checkpoint - Only show for authenticated users */}
              {isMiddayMode && !isGuest && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <h4 className="text-sm font-medium text-foreground">
                    Midday Check ✨
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {onContinueTomorrow && !task.continueTomorrow && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log(
                            "Continue Tomorrow button clicked for task:",
                            task.id
                          );
                          setShowProgressField(true);
                        }}
                        className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                      >
                        📅 Continue Tomorrow
                      </Button>
                    )}
                    {/* Show Edit Progress button if task is already marked to continue tomorrow */}
                    {onContinueTomorrow && task.continueTomorrow && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log(
                            "Edit Progress clicked for task:",
                            task.id
                          );
                          setShowProgressField(true);
                        }}
                        className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                      >
                        ✏️ Edit Progress
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* EOD Review - Only show for authenticated users */}
              {isEODMode && !isGuest && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <h4 className="text-sm font-medium text-foreground">
                    Victory lap 🏁
                  </h4>

                  <div className="flex gap-2 flex-wrap">
                    {onContinueTomorrow && !task.continueTomorrow && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log(
                            "Continue Tomorrow button clicked for task (EOD):",
                            task.id
                          );
                          setShowProgressField(true);
                        }}
                        className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                      >
                        📅 Continue Tomorrow
                      </Button>
                    )}
                    {/* Show Edit Progress button if task is already marked to continue tomorrow */}
                    {onContinueTomorrow && task.continueTomorrow && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log(
                            "Edit Progress clicked for task (EOD):",
                            task.id
                          );
                          setShowProgressField(true);
                        }}
                        className="text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                      >
                        ✏️ Edit Progress
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Carryover Mode - Only show for authenticated users */}
              {isCarryoverMode && !isGuest && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <h4 className="text-sm font-medium text-foreground">
                    Continue Tomorrow 📅
                  </h4>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Progress & Obstacles
                    </label>
                    <textarea
                      placeholder="What obstacles prevented completion? What progress was made?"
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
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
                </div>
              )}

              {/* Continue Tomorrow Progress Field - Only show for authenticated users */}
              {showProgressField && (isMiddayMode || isEODMode) && !isGuest && (
                <div className="bg-warning/10 rounded-lg p-3 space-y-3">
                  <h4 className="text-sm font-medium text-foreground">
                    Continue Tomorrow Progress 📅
                  </h4>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      What will you continue tomorrow?
                    </label>
                    <div className="relative">
                      <textarea
                        placeholder="Describe what you'll continue working on tomorrow..."
                        value={progress}
                        onChange={(e) => setProgress(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none pr-10"
                        rows={3}
                      />
                      <button
                        type="button"
                        onClick={() => handleVoiceInput("progress")}
                        className={cn(
                          "absolute right-3 top-3 p-1 rounded-full transition-all duration-200",
                          isRecording
                            ? "bg-red-500 text-white"
                            : "hover:bg-cyan-500 text-white-cyan-500"
                        )}
                      >
                        {isRecording ? (
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <Button
                      onClick={() => {
                        console.log("Save Continue Tomorrow clicked", {
                          taskId: task.id,
                          progress,
                        });
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

              {/* Details Section */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Deliverable
                    </label>
                    {isReadOnly || isGuest ? (
                      <p className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[40px]">
                        {task.deliverable || "No deliverable specified"}
                      </p>
                    ) : (
                      <div className="relative">
                        <textarea
                          placeholder="What was delivered for this task?"
                          value={deliverable}
                          onChange={(e) => setDeliverable(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none pr-10"
                          rows={2}
                        />
                        <button
                          type="button"
                          onClick={() => handleVoiceInput("deliverable")}
                          className={cn(
                            "absolute right-3 top-3 p-1 rounded-full transition-all duration-200",
                            isRecording
                              ? "bg-red-500 text-white"
                              : "hover:bg-cyan-500 text-white-cyan-500"
                          )}
                        >
                          {isRecording ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Bottleneck
                    </label>
                    {isReadOnly || isGuest ? (
                      <p className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[40px]">
                        {task.bottleneck || "No bottlenecks reported"}
                      </p>
                    ) : (
                      <textarea
                        placeholder="What blocked or slowed you down?"
                        value={bottleneck}
                        onChange={(e) => setBottleneck(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none"
                        rows={2}
                      />
                    )}
                  </div>
                  {task.progress && (
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        {task.continueTomorrow
                          ? "Continue Tomorrow Progress"
                          : "Progress Notes"}
                      </label>
                      <p className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[40px]">
                        {task.progress}
                      </p>
                    </div>
                  )}
                  {!isReadOnly && !isGuest && onSaveDetails && (
                    <Button
                      onClick={() => {
                        console.log("Save button clicked", {
                          taskId: task.id,
                          deliverable,
                          bottleneck,
                          progress,
                        });
                        onSaveDetails(
                          task.id,
                          deliverable,
                          bottleneck,
                          progress
                        );
                      }}
                      size="sm"
                      className="w-full"
                    >
                      Save Details
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* View Details Toggle for Overview Mode - Only show for authenticated users when not expanded */}
          {!isMiddayMode &&
            !isEODMode &&
            !isCarryoverMode &&
            !isExpanded &&
            !isGuest &&
            onToggleDetails && (
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
          {onDelete && !isReadOnly && !isGuest && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              task.status === "completed" && "bg-success",
              task.status === "in-progress" && "bg-primary animate-pulse-glow",
              task.status === "blocked" && "bg-destructive",
              task.status === "todo" && "bg-muted-foreground"
            )}
          />
        </div>
      </div>
    </Card>
  );
}
