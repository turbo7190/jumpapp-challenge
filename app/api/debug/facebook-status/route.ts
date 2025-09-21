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

    console.log(`🔍 Debugging Facebook status for user: ${session.user.id}`);

    // Get SocialAccount records
    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        userId: session.user.id,
        platform: "facebook",
      },
    });

    // Get NextAuth Account records
    const nextAuthAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: "facebook",
      },
    });

    console.log("📊 SocialAccount records:", socialAccounts);
    console.log("📊 NextAuth Account records:", nextAuthAccounts);

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
    console.error("Error debugging Facebook status:", error);
    return NextResponse.json(
      { error: "Failed to debug Facebook status" },
      { status: 500 }
    );
  }
}
