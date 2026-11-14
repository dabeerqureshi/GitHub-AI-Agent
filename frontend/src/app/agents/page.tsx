"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExecutionTimeline } from "@/components/runs/ExecutionTimeline";

export default function AgentsPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        <ExecutionTimeline />
      </div>
    </AppLayout>
  );
}
