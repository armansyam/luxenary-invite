"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { FeedbackProvider } from "@/components/ui/Feedback";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <FeedbackProvider>{children}</FeedbackProvider>
    </SessionProvider>
  );
}