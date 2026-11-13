"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ExecutionTimeline } from "@/components/runs/ExecutionTimeline";

export default function RunsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 w-full mx-auto overflow-hidden">
        <ExecutionTimeline />
      </main>
    </div>
  );
}
