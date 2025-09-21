import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Clearing session for user:", session.user.id);

    // Only delete sessions to force re-authentication, keep the account
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    console.log("Deleted sessions:", deletedSessions.count);

    return NextResponse.json({
      success: true,
      message: "Session cleared. Please sign in again.",
      deletedSessions: deletedSessions.count,
    });
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.json(
      { error: "Failed to clear session" },
      { status: 500 }
    );
  }
}
