"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Overview of all evaluation activity",
  },
  "/dashboard/model-test": {
    title: "Model Accuracy Test",
    description: "Benchmark AI reasoning and anti-hallucination accuracy",
  },
  "/dashboard/import": {
    title: "Import Submissions",
    description: "Upload and batch-evaluate 500 participant submissions",
  },
  "/dashboard/evaluations": {
    title: "Evaluations",
    description: "Manage all submission evaluations",
  },
  "/dashboard/evaluations/new": {
    title: "New Evaluation",
    description: "Create a new submission evaluation",
  },
  "/dashboard/settings": {
    title: "Settings",
    description: "Configure API keys and preferences",
  },
};

export function TopNav({
  userName,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  userName: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const pathname = usePathname();

  // Match exact or closest parent
  let pageInfo = pageTitles[pathname];
  if (!pageInfo) {
    if (pathname.includes("/evaluations/") && pathname.includes("/proposal")) {
      pageInfo = { title: "Proposal Analysis", description: "Review extracted proposal content and AI scores" };
    } else if (pathname.includes("/evaluations/") && pathname.includes("/code")) {
      pageInfo = { title: "Code Review", description: "Review code structure and AI evaluation" };
    } else if (pathname.includes("/evaluations/") && pathname.includes("/report")) {
      pageInfo = { title: "Final Report", description: "Complete evaluation report and export" };
    } else if (pathname.includes("/evaluations/")) {
      pageInfo = { title: "Evaluation Detail", description: "Review and manage submission evaluation" };
    } else {
      pageInfo = { title: "Hackathon Evaluator", description: "" };
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{pageInfo.title}</h1>
            {pageInfo.description && (
              <p className="text-sm text-muted-foreground">{pageInfo.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {userName}
          </Badge>
        </div>
      </div>
    </header>
  );
}
