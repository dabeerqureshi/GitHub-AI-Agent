"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApprovalCenter } from "@/components/approvals/ApprovalCenter";

export default function ApprovalsPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        <ApprovalCenter />
      </div>
    </AppLayout>
  );
}
