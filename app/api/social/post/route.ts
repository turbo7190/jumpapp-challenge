import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { postToFacebook } from "@/lib/facebook";
import { postToLinkedIn } from "@/lib/linkedin";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { platform, message } = await request.json();

    if (!platform || !message) {
      return NextResponse.json(
        { error: "Platform and message are required" },
        { status: 400 }
      );
    }

    let result;

    switch (platform.toLowerCase()) {
      case "facebook":
        result = await postToFacebook(session.user.id, message);
        break;
      case "linkedin":
        result = await postToLinkedIn(session.user.id, message);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported platform" },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        postId: result.postId,
        pageName: result.pageName, // Include page name for Facebook posts
        message: `Successfully posted to ${platform}`,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to post" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error posting to social media:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
