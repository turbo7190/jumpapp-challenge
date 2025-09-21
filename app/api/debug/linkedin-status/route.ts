import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🔍 Debugging LinkedIn status for user: ${session.user.id}`);

    // Get SocialAccount records
    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        userId: session.user.id,
        platform: "linkedin",
      },
    });

    // Get NextAuth Account records
    const nextAuthAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: "linkedin",
      },
    });

    console.log("📊 LinkedIn SocialAccount records:", socialAccounts);
    console.log("📊 LinkedIn NextAuth Account records:", nextAuthAccounts);

    return NextResponse.json({
      userId: session.user.id,
      userEmail: session.user.email,
      socialAccounts,
      nextAuthAccounts,
      summary: {
        socialAccountCount: socialAccounts.length,
        nextAuthAccountCount: nextAuthAccounts.length,
        hasActiveSocialAccount: socialAccounts.some(acc => acc.isActive),
        hasValidNextAuthAccount: nextAuthAccounts.length > 0,
      }
    });
  } catch (error) {
    console.error("Error debugging LinkedIn status:", error);
    return NextResponse.json(
      { error: "Failed to debug LinkedIn status" },
      { status: 500 }
    );
  }
}
