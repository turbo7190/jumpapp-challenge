import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "No active session found",
        },
        { status: 401 }
      );
    }

    // Get the user's accounts from database
    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
    });

    // Get user settings
    const userSettings = await prisma.userSettings.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    const googleAccount = accounts.find((acc) => acc.provider === "google");

    return NextResponse.json({
      authenticated: true,
      session: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
        expires: session.expires,
      },
      accounts: {
        total: accounts.length,
        providers: accounts.map((acc) => acc.provider),
        google: googleAccount
          ? {
              provider: googleAccount.provider,
              type: googleAccount.type,
              hasAccessToken: !!googleAccount.access_token,
              hasRefreshToken: !!googleAccount.refresh_token,
              scope: googleAccount.scope,
              expiresAt: googleAccount.expires_at,
            }
          : null,
      },
      userSettings: userSettings,
      authStatus: {
        hasGoogleAccount: !!googleAccount,
        hasValidGoogleToken: !!googleAccount?.access_token,
        needsReauth: !googleAccount || !googleAccount.access_token,
      },
    });
  } catch (error: any) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: "Failed to get auth status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
