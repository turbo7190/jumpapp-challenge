import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();
    const platform = params.platform;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Get the user's social media account for this platform
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        userId: session.user.id,
        platform: platform,
        isActive: true,
      },
    });

    if (!socialAccount) {
      return NextResponse.json(
        {
          error: `No ${platform} account configured. Please connect your ${platform} account first.`,
        },
        { status: 400 }
      );
    }

    // Check if the access token is still valid
    if (socialAccount.expiresAt && socialAccount.expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: `${platform} access token has expired. Please reconnect your account.`,
        },
        { status: 400 }
      );
    }

    // Post to the social media platform
    let postResult;

    if (platform === "linkedin") {
      postResult = await postToLinkedIn(socialAccount.accessToken, content);
    } else if (platform === "facebook") {
      postResult = await postToFacebook(socialAccount.accessToken, content);
    } else {
      return NextResponse.json(
        { error: "Unsupported platform" },
        { status: 400 }
      );
    }

    if (postResult.success) {
      // Update the social post status to "posted"
      await prisma.socialPost.updateMany({
        where: {
          platform: platform,
          content: content,
          status: "draft",
        },
        data: {
          status: "posted",
          postedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        postId: postResult.postId,
        message: `Successfully posted to ${platform}`,
      });
    } else {
      return NextResponse.json(
        { error: postResult.error || `Failed to post to ${platform}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error posting to ${params.platform}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function postToLinkedIn(accessToken: string, content: string) {
  try {
    // LinkedIn API endpoint for posting
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: "urn:li:person:YOUR_LINKEDIN_ID", // This would need to be fetched from LinkedIn API
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        postId: data.id,
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "LinkedIn API error",
      };
    }
  } catch (error) {
    console.error("LinkedIn posting error:", error);
    return {
      success: false,
      error: "Failed to post to LinkedIn",
    };
  }
}

async function postToFacebook(accessToken: string, content: string) {
  try {
    // Facebook Graph API endpoint for posting
    const response = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: content,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        postId: data.id,
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || "Facebook API error",
      };
    }
  } catch (error) {
    console.error("Facebook posting error:", error);
    return {
      success: false,
      error: "Failed to post to Facebook",
    };
  }
}
