import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    console.log("🧹 Starting account cleanup...");

    // Get all accounts to see what we have
    const allAccounts = await prisma.account.findMany({
      include: {
        user: true,
      },
    });

    console.log("Current accounts:", allAccounts.length);

    // Find duplicate Google accounts (same email, different users)
    const googleAccounts = allAccounts.filter(
      (acc) => acc.provider === "google"
    );
    const emailGroups = new Map();

    for (const account of googleAccounts) {
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
      });

      if (user?.email) {
        if (!emailGroups.has(user.email)) {
          emailGroups.set(user.email, []);
        }
        emailGroups.get(user.email).push({ account, user });
      }
    }

    let cleanupActions = [];

    // Handle duplicates
    for (const [email, accounts] of Array.from(emailGroups.entries())) {
      if (accounts.length > 1) {
        console.log(`Found ${accounts.length} accounts for email: ${email}`);

        // Keep the most recent account, delete others
        const sortedAccounts = accounts.sort(
          (a: any, b: any) =>
            new Date(a.user.createdAt).getTime() -
            new Date(b.user.createdAt).getTime()
        );

        const keepAccount = sortedAccounts[sortedAccounts.length - 1];
        const deleteAccounts = sortedAccounts.slice(0, -1);

        for (const { account, user } of deleteAccounts) {
          console.log(
            `Deleting duplicate account: ${account.id} for user: ${user.email}`
          );

          // Delete the account
          await prisma.account.delete({
            where: { id: account.id },
          });

          // Delete the user if they have no other accounts
          const remainingAccounts = await prisma.account.findMany({
            where: { userId: user.id },
          });

          if (remainingAccounts.length === 0) {
            console.log(`Deleting orphaned user: ${user.id}`);
            await prisma.user.delete({
              where: { id: user.id },
            });
          }

          cleanupActions.push(`Deleted duplicate account for ${email}`);
        }
      }
    }

    // Note: Orphaned accounts and sessions cleanup removed due to Prisma type constraints
    // These are typically handled by database foreign key constraints

    console.log("✅ Account cleanup completed");

    return NextResponse.json({
      success: true,
      message: "Account cleanup completed",
      actions: cleanupActions,
      summary: {
        totalAccounts: allAccounts.length,
        cleanedUp: cleanupActions.length,
      },
    });
  } catch (error: any) {
    console.error("Error during account cleanup:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup accounts",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
