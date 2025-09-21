import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    console.log("💥 Starting nuclear reset...");

    // Get counts before deletion
    const beforeCounts = {
      users: await prisma.user.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
    };

    console.log("Before reset:", beforeCounts);

    // Delete everything in the correct order to avoid foreign key constraints
    await prisma.socialPost.deleteMany({});
    await prisma.automation.deleteMany({});
    await prisma.userSettings.deleteMany({});
    await prisma.socialAccount.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});

    // Get counts after deletion
    const afterCounts = {
      users: await prisma.user.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
    };

    console.log("After reset:", afterCounts);

    return NextResponse.json({
      success: true,
      message:
        "Nuclear reset completed - all users, accounts, and sessions deleted",
      before: beforeCounts,
      after: afterCounts,
      reset: {
        users: beforeCounts.users,
        accounts: beforeCounts.accounts,
        sessions: beforeCounts.sessions,
      },
    });
  } catch (error: any) {
    console.error("Error during nuclear reset:", error);
    return NextResponse.json(
      {
        error: "Failed to perform nuclear reset",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
