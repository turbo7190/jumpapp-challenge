import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const platform = params.platform.toLowerCase();

    if (!["linkedin", "facebook"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Generate OAuth URL for the platform
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
    const authUrl = `${baseUrl}/api/auth/signin/${platform}?callbackUrl=${encodeURIComponent(
      baseUrl
    )}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error initiating social auth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
