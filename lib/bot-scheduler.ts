import { prisma } from "./prisma";
import { getBotStatus, pollBotStatus, getBotTranscript } from "./recall";

export async function pollAllBotStatuses() {
  console.log("🤖 Polling bot statuses...");

  try {
    // Get all meetings with active bots
    const meetingsWithBots = await prisma.meeting.findMany({
      where: {
        recallBotId: { not: null },
        recallStatus: { in: ["scheduled", "recording", "pending"] },
        startTime: { lte: new Date() }, // Only check meetings that have started
      },
    });

    console.log(`Found ${meetingsWithBots.length} meetings with active bots`);

    for (const meeting of meetingsWithBots) {
      if (!meeting.recallBotId) continue;

      try {
        console.log(`Checking bot status for meeting: ${meeting.title}`);
        const botStatus = await getBotStatus(meeting.recallBotId);

        let newStatus = meeting.recallStatus;
        let transcript = meeting.transcript;

        switch (botStatus.status) {
          case "recording":
            newStatus = "recording";
            break;
          case "done":
            newStatus = "completed";
            // Try to get transcript
            try {
              const transcriptData = await getBotTranscript(
                meeting.recallBotId
              );
              transcript = transcriptData.transcript || "";
            } catch (error) {
              console.error(
                `Error getting transcript for meeting ${meeting.id}:`,
                error
              );
            }
            break;
          case "error":
            newStatus = "failed";
            break;
        }

        // Update meeting if status changed
        if (
          newStatus !== meeting.recallStatus ||
          transcript !== meeting.transcript
        ) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
              recallStatus: newStatus,
              transcript: transcript || meeting.transcript,
            },
          });

          console.log(
            `Updated meeting ${meeting.title}: ${meeting.recallStatus} -> ${newStatus}`
          );
        }
      } catch (error) {
        console.error(
          `Error checking bot status for meeting ${meeting.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error polling bot statuses:", error);
  }
}

export async function scheduleUpcomingBots() {
  console.log("📅 Checking for upcoming meetings to schedule bots...");

  try {
    // Get meetings starting in the next 24 hours that need bot scheduling
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        startTime: {
          gte: now,
          lte: tomorrow,
        },
        isNotetakerEnabled: true,
        recallBotId: null,
        meetingUrl: { not: null },
      },
    });

    console.log(
      `Found ${upcomingMeetings.length} upcoming meetings needing bot scheduling`
    );

    for (const meeting of upcomingMeetings) {
      if (!meeting.meetingUrl) continue;

      try {
        const { createBotAndInvite } = await import("./recall");

        // Get user's bot timing preference
        const userSettings = await prisma.userSettings.findUnique({
          where: { userId: meeting.userId },
        });

        const botJoinMinutesBefore = userSettings?.botJoinMinutesBefore || 2;
        const botJoinTime = new Date(
          meeting.startTime.getTime() - botJoinMinutesBefore * 60 * 1000
        );

        // Only schedule if the join time is in the future
        if (botJoinTime > now) {
          // Create a new bot for the meeting
          const { botId } = await createBotAndInvite(
            meeting.meetingUrl,
            meeting.startTime.toISOString(),
            botJoinMinutesBefore,
            meeting.title
          );

          await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
              recallBotId: botId,
              recallStatus: "scheduled",
            },
          });

          console.log(
            `Bot created and scheduled for meeting: ${
              meeting.title
            } at ${botJoinTime.toISOString()}`
          );
        }
      } catch (error) {
        console.error(`Error creating bot for meeting ${meeting.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error scheduling upcoming bots:", error);
  }
}

// Run bot polling every 5 minutes
export function startBotScheduler() {
  console.log("🚀 Starting bot scheduler...");

  // Run immediately
  pollAllBotStatuses();
  scheduleUpcomingBots();

  // Then run every 5 minutes
  setInterval(() => {
    pollAllBotStatuses();
    scheduleUpcomingBots();
  }, 5 * 60 * 1000);
}
