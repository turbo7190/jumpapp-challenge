import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { pollAllBotStatuses, scheduleUpcomingBots } from "@/lib/bot-scheduler";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Manual bot polling triggered by user:", session.user.id);

    // Run bot polling
    await pollAllBotStatuses();
    await scheduleUpcomingBots();

    return NextResponse.json({
      success: true,
      message: "Bot polling completed",
    });
  } catch (error) {
    console.error("Error in manual bot polling:", error);
    return NextResponse.json(
      { error: "Failed to poll bot statuses" },
      { status: 500 }
    );
  }
}
