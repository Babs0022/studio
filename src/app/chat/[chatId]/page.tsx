
"use client";

import { Suspense } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import ChatClient from "@/components/features/chat/ChatClient";
import { LoaderCircle } from 'lucide-react';

export default function ChatPage() {
  return (
    <DashboardLayout>
      <main className="flex-1 flex flex-col">
        <Suspense fallback={
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <span className="text-muted-foreground">Loading Chat...</span>
            </div>
          </div>
        }>
          <ChatClient />
        </Suspense>
      </main>
    </DashboardLayout>
  );
}
