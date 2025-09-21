"use client";

import { SessionProvider } from "next-auth/react";
import { BotSchedulerProvider } from "@/components/BotSchedulerProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BotSchedulerProvider>{children}</BotSchedulerProvider>
    </SessionProvider>
  );
}
