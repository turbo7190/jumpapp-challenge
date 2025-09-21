import { NextResponse } from "next/server";
import { startBotScheduler } from "@/lib/bot-scheduler";

// Global variable to track if scheduler is already running
let isSchedulerRunning = false;

export async function POST() {
  try {
    if (!isSchedulerRunning) {
      console.log("🚀 Initializing bot scheduler...");
      startBotScheduler();
      isSchedulerRunning = true;
      console.log("✅ Bot scheduler started successfully");

      return NextResponse.json({
        success: true,
        message: "Bot scheduler initialized successfully",
      });
    } else {
      return NextResponse.json({
        success: true,
        message: "Bot scheduler already running",
      });
    }
  } catch (error) {
    console.error("Error initializing bot scheduler:", error);
    return NextResponse.json(
      { error: "Failed to initialize bot scheduler" },
      { status: 500 }
    );
  }
}
