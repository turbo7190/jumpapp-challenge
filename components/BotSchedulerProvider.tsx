"use client";

import { useEffect } from "react";

export function BotSchedulerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize bot scheduler on the client side
    const initializeBotScheduler = async () => {
      try {
        // Call the bot scheduler initialization endpoint
        await fetch("/api/bots/init", { method: "POST" });
        console.log("Bot scheduler initialized");
      } catch (error) {
        console.error("Failed to initialize bot scheduler:", error);
      }
    };

    initializeBotScheduler();
  }, []);

  return <>{children}</>;
}
