import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      settings: settings || { botJoinMinutesBefore: 2 },
      socialAccounts,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botJoinMinutesBefore, openaiApiKey } = await request.json();

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        ...(botJoinMinutesBefore && { botJoinMinutesBefore }),
        ...(openaiApiKey && { openaiApiKey }),
      },
      create: {
        userId: session.user.id,
        botJoinMinutesBefore: botJoinMinutesBefore || 2,
        openaiApiKey,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
