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

    // Find Facebook account in NextAuth accounts table
    const facebookAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "facebook",
      },
    });

    if (!facebookAccount) {
      return NextResponse.json(
        { error: "No Facebook account found in NextAuth" },
        { status: 404 }
      );
    }

    console.log("Found Facebook account in NextAuth:", {
      id: facebookAccount.id,
      provider: facebookAccount.provider,
      providerAccountId: facebookAccount.providerAccountId,
    });

    // Check if SocialAccount already exists
    const existingSocialAccount = await prisma.socialAccount.findFirst({
      where: {
        userId: session.user.id,
        platform: "facebook",
        platformUserId: facebookAccount.providerAccountId,
      },
    });

    if (existingSocialAccount) {
      // Update existing account
      const updatedAccount = await prisma.socialAccount.update({
        where: { id: existingSocialAccount.id },
        data: {
          accessToken: facebookAccount.access_token || existingSocialAccount.accessToken,
          refreshToken: facebookAccount.refresh_token || existingSocialAccount.refreshToken,
          expiresAt: facebookAccount.expires_at ? new Date(facebookAccount.expires_at * 1000) : existingSocialAccount.expiresAt,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Updated existing Facebook SocialAccount",
        account: {
          id: updatedAccount.id,
          platform: updatedAccount.platform,
          platformUserId: updatedAccount.platformUserId,
          isActive: updatedAccount.isActive,
        },
      });
    } else {
      // Create new SocialAccount
      const newSocialAccount = await prisma.socialAccount.create({
        data: {
          userId: session.user.id,
          platform: "facebook",
          platformUserId: facebookAccount.providerAccountId,
          accessToken: facebookAccount.access_token || "",
          refreshToken: facebookAccount.refresh_token,
          expiresAt: facebookAccount.expires_at ? new Date(facebookAccount.expires_at * 1000) : null,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Created new Facebook SocialAccount",
        account: {
          id: newSocialAccount.id,
          platform: newSocialAccount.platform,
          platformUserId: newSocialAccount.platformUserId,
          isActive: newSocialAccount.isActive,
        },
      });
    }
  } catch (error) {
    console.error("Error syncing Facebook account:", error);
    return NextResponse.json(
      { error: "Failed to sync Facebook account" },
      { status: 500 }
    );
  }
}
