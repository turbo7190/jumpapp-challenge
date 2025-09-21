import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "🔍 Finding meetings with notetaker enabled for user:",
      session.user.id
    );

    // Get all meetings with notetaker enabled for this user
    const enabledMeetings = await prisma.meeting.findMany({
      where: {
        userId: session.user.id,
        isNotetakerEnabled: true,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        isNotetakerEnabled: true,
        recallBotId: true,
        recallStatus: true,
      },
    });

    console.log(
      `📊 Found ${enabledMeetings.length} meetings with notetaker enabled`
    );

    if (enabledMeetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No meetings with notetaker enabled found",
        disabled: 0,
        cleaned: 0,
      });
    }

    // Disable notetaker for all meetings
    const result = await prisma.meeting.updateMany({
      where: {
        userId: session.user.id,
        isNotetakerEnabled: true,
      },
      data: {
        isNotetakerEnabled: false,
      },
    });

    console.log(`✅ Disabled notetaker for ${result.count} meetings`);

    // Also clean up any bot IDs and statuses since we're disabling
    const cleanupResult = await prisma.meeting.updateMany({
      where: {
        userId: session.user.id,
        recallBotId: { not: null },
      },
      data: {
        recallBotId: null,
        recallStatus: null,
      },
    });

    console.log(`🧹 Cleaned up bot data for ${cleanupResult.count} meetings`);

    // Verify the changes
    const remainingEnabled = await prisma.meeting.count({
      where: {
        userId: session.user.id,
        isNotetakerEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Disabled notetaker for ${result.count} meetings and cleaned up bot data`,
      disabled: result.count,
      cleaned: cleanupResult.count,
      remaining: remainingEnabled,
      meetings: enabledMeetings.map((m) => ({
        title: m.title,
        startTime: m.startTime,
        hadBot: !!m.recallBotId,
      })),
    });
  } catch (error: any) {
    console.error("Error disabling notetakers:", error);
    return NextResponse.json(
      {
        error: "Failed to disable notetakers",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
