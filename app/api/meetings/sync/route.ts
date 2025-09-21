import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  fetchUpcomingEvents,
  extractMeetingUrl,
  getPlatformFromUrl,
  extractAttendeesFromDescription,
} from "@/lib/google-calendar";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch events from Google Calendar
    let events = [];
    try {
      events = await fetchUpcomingEvents(session.user.id);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      return NextResponse.json(
        {
          error:
            "Failed to fetch calendar events. Please check your Google Calendar permissions.",
          details: error.message,
        },
        { status: 403 }
      );
    }

    const syncedMeetings = [];

    for (const event of events) {
      if (!event.start?.dateTime) continue;

      const meetingUrl = extractMeetingUrl(event);
      const platform = meetingUrl ? getPlatformFromUrl(meetingUrl) : "unknown";

      // Debug: Log event details including attendees
      console.log(`🔍 Processing event: ${event.summary}`);
      console.log(`  Platform: ${platform}`);
      console.log(`  Meeting URL: ${meetingUrl}`);
      console.log(`  Attendees:`, event.attendees || []);
      console.log(`  Attendee count:`, event.attendees?.length || 0);
      console.log(`  Description:`, event.description || "");
      console.log(`  Location:`, event.location || "");

      // Check if meeting already exists
      const existingMeeting = await prisma.meeting.findFirst({
        where: {
          userId: session.user.id,
          title: event.summary || "Untitled Meeting",
          startTime: new Date(event.start.dateTime),
        },
      });

      console.log(existingMeeting, "existingMeeting");

      if (!existingMeeting) {
        const meeting = await prisma.meeting.create({
          data: {
            userId: session.user.id,
            title: event.summary || "Untitled Meeting",
            description: event.description || "",
            startTime: new Date(event.start.dateTime),
            endTime: new Date(event.end?.dateTime || event.start.dateTime),
            platform,
            meetingUrl,
            attendees: JSON.stringify(
              (() => {
                // Get attendees from Google Calendar API
                const apiAttendees =
                  event.attendees?.map((a) => ({
                    email: a.email,
                    displayName: a.displayName || a.email,
                    responseStatus: a.responseStatus,
                    organizer: a.organizer,
                    source: "api",
                  })) || [];

                // Get attendees from description text
                const descriptionAttendees = extractAttendeesFromDescription(
                  event.description || ""
                ).map((email) => ({
                  email,
                  displayName: email,
                  responseStatus: "unknown",
                  organizer: false,
                  source: "description",
                }));

                // Combine and deduplicate
                const allAttendees = [...apiAttendees, ...descriptionAttendees];
                const uniqueAttendees = allAttendees.filter(
                  (attendee, index, self) =>
                    index === self.findIndex((a) => a.email === attendee.email)
                );

                // If no attendees found, try to extract organizer from event
                if (uniqueAttendees.length === 0 && event.organizer?.email) {
                  uniqueAttendees.push({
                    email: event.organizer.email,
                    displayName:
                      event.organizer.displayName || event.organizer.email,
                    responseStatus: "accepted",
                    organizer: true,
                    source: "organizer",
                  });
                }

                console.log(
                  `  📋 Final attendees (${uniqueAttendees.length}):`,
                  uniqueAttendees
                );
                return uniqueAttendees;
              })()
            ),
            // Notetaker is disabled by default - user must manually enable it
            isNotetakerEnabled: false,
          },
        });

        // If meeting has a URL and notetaker is enabled, schedule the bot
        if (meetingUrl && meeting.isNotetakerEnabled) {
          try {
            const { createBotAndInvite } = await import("@/lib/recall");

            // Get user's bot timing preference
            const userSettings = await prisma.userSettings.findUnique({
              where: { userId: session.user.id },
            });

            const botJoinMinutesBefore =
              userSettings?.botJoinMinutesBefore || 2;

            // Create a new bot for the meeting
            const { botId } = await createBotAndInvite(
              meetingUrl,
              meeting.startTime.toISOString(),
              botJoinMinutesBefore,
              meeting.title
            );

            // Update meeting with bot info
            await prisma.meeting.update({
              where: { id: meeting.id },
              data: {
                recallBotId: botId,
                recallStatus: "scheduled",
              },
            });

            const botJoinTime = new Date(
              meeting.startTime.getTime() - botJoinMinutesBefore * 60 * 1000
            );
            console.log(
              `Bot created and scheduled for meeting: ${
                meeting.title
              } at ${botJoinTime.toISOString()}`
            );
          } catch (error: any) {
            console.error("Error creating bot for meeting:", error);
            // Don't fail the sync if bot creation fails
          }
        }

        syncedMeetings.push(meeting);
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedMeetings.length,
      meetings: syncedMeetings,
    });
  } catch (error: any) {
    console.error("Error syncing meetings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
