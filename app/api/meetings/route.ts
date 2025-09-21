import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createBotAndInvite } from "@/lib/recall";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email for attendee matching
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch upcoming meetings from database
    // Include meetings where user is creator OR attendee
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                userId: session.user.id, // User is the creator
              },
              {
                attendees: {
                  contains: user.email, // User is an attendee
                },
              },
            ],
          },
          {
            startTime: {
              gte: new Date(),
            },
          },
          {
            OR: [
              {
                recallStatus: null,
              },
              {
                recallStatus: {
                  notIn: ["completed"],
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        startTime: "asc",
      },
    });

    console.log(
      `📅 Upcoming meetings (${upcomingMeetings.length}):`,
      upcomingMeetings.map((m) => ({
        id: m.id,
        title: m.title,
        startTime: m.startTime,
        recallStatus: m.recallStatus,
      }))
    );

    // Fetch past meetings
    // Include meetings where user is creator OR attendee
    // Show meetings that are EITHER past OR completed
    const pastMeetings = await prisma.meeting.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                userId: session.user.id, // User is the creator
              },
              {
                attendees: {
                  contains: user.email, // User is an attendee
                },
              },
            ],
          },
          {
            OR: [
              {
                startTime: {
                  lt: new Date(), // Meeting is in the past
                },
              },
              {
                recallStatus: "completed", // OR meeting is completed
              },
            ],
          },
        ],
      },
      orderBy: {
        startTime: "desc",
      },
    });

    console.log(
      `📋 Past meetings (${pastMeetings.length}):`,
      pastMeetings.map((m) => ({
        id: m.id,
        title: m.title,
        startTime: m.startTime,
        recallStatus: m.recallStatus,
      }))
    );

    return NextResponse.json({
      upcoming: upcomingMeetings,
      past: pastMeetings,
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, meetingId, isNotetakerEnabled } = await request.json();

    if (action === "toggle-notetaker") {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }

      // If enabling notetaker and no bot is assigned, create one
      if (isNotetakerEnabled && !meeting.recallBotId) {
        if (meeting.meetingUrl) {
          try {
            // Get user's bot timing preference
            const userSettings = await prisma.userSettings.findUnique({
              where: { userId: session.user.id },
            });

            const botJoinMinutesBefore =
              userSettings?.botJoinMinutesBefore || 2;

            // Create a new bot for the meeting
            const { botId } = await createBotAndInvite(
              meeting.meetingUrl,
              meeting.startTime.toISOString(),
              botJoinMinutesBefore,
              meeting.title
            );

            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                isNotetakerEnabled: true,
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
            console.error("Error creating bot and invite:", error);
            return NextResponse.json(
              { error: `Failed to create bot: ${error.message}` },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "No meeting URL found" },
            { status: 400 }
          );
        }
      } else {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { isNotetakerEnabled },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating meeting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
