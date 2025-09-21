import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all social accounts for the user
    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        userId: session.user.id,
      },
    });

    // Get all accounts from NextAuth
    const nextAuthAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      userId: session.user.id,
      userEmail: session.user.email,
      socialAccounts,
      nextAuthAccounts,
    });
  } catch (error) {
    console.error("Error debugging social accounts:", error);
    return NextResponse.json(
      { error: "Failed to debug social accounts" },
      { status: 500 }
    );
  }
}
