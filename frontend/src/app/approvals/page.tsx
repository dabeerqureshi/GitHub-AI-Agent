"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ApprovalCenter } from "@/components/approvals/ApprovalCenter";

export default function ApprovalsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 w-full mx-auto overflow-hidden">
        <ApprovalCenter />
      </main>
    </div>
  );
}
