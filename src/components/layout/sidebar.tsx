"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileSearch,
  PlusCircle,
  Settings,
  Shield,
  LogOut,
  FileSpreadsheet,
  Sparkles,
  Gauge,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MagneticButton } from "@/components/ui/motion/magnetic-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/model-test", label: "Model Accuracy Test", icon: Gauge },
  { href: "/dashboard/import", label: "Import Submissions", icon: FileSpreadsheet },
  { href: "/dashboard/evaluations", label: "Evaluations", icon: FileSearch },
  { href: "/dashboard/evaluations/new", label: "Single Evaluation", icon: PlusCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white/95 backdrop-blur-xl flex flex-col shadow-sm">
      {/* Animated Logo */}
      <div className="flex items-center gap-3 px-6 py-5 group cursor-default">
        <div className="relative h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
          <Shield className="h-5 w-5 text-blue-600 transition-transform duration-300 group-hover:rotate-6" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold tracking-tight text-slate-900">Hackathon</h1>
            <Sparkles className="h-3 w-3 text-blue-500 opacity-90" />
          </div>
          <p className="text-xs text-slate-500 -mt-0.5 font-medium">AI Judging Engine</p>
        </div>
      </div>

      <Separator className="bg-slate-200" />

      {/* Navigation with Codrops Sliding Active Pill */}
      <nav className="flex-1 px-3 py-4 space-y-1 relative">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard/evaluations"
              ? pathname.startsWith("/dashboard/evaluations/") && pathname !== "/dashboard/evaluations/new"
              : item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 select-none",
                isActive
                  ? "text-blue-600 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 rounded-xl bg-blue-50 border border-blue-200/80 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon
                className={cn(
                  "relative z-10 h-4 w-4 transition-transform duration-200",
                  isActive ? "text-blue-600 scale-110" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer with Magnetic Logout */}
      <div className="p-3 border-t border-slate-200">
        <MagneticButton
          magneticStrength={0.15}
          onClick={handleLogout}
          className="w-full flex items-center justify-start px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors font-medium"
        >
          <LogOut className="mr-3 h-4 w-4 text-slate-400" />
          Sign Out
        </MagneticButton>
      </div>
    </aside>
  );
}
