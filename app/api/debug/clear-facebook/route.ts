import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🗑️ Clearing Facebook accounts for user: ${session.user.id}`);

    // Delete all Facebook SocialAccount records for this user
    const deletedAccounts = await prisma.socialAccount.deleteMany({
      where: {
        userId: session.user.id,
        platform: "facebook",
      },
    });

    // Also delete Facebook Account records from NextAuth
    const deletedNextAuthAccounts = await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "facebook",
      },
    });

    console.log(`✅ Deleted ${deletedAccounts.count} SocialAccount records`);
    console.log(`✅ Deleted ${deletedNextAuthAccounts.count} NextAuth Account records`);

    return NextResponse.json({
      success: true,
      message: "Facebook accounts cleared successfully",
      deletedSocialAccounts: deletedAccounts.count,
      deletedNextAuthAccounts: deletedNextAuthAccounts.count,
    });
  } catch (error) {
    console.error("Error clearing Facebook accounts:", error);
    return NextResponse.json(
      { error: "Failed to clear Facebook accounts" },
      { status: 500 }
    );
  }
}
