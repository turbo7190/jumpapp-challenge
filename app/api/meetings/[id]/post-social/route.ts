import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateSocialMediaPost } from "@/lib/openai";
import { postToFacebook } from "@/lib/facebook";
import { postToLinkedIn } from "@/lib/linkedin";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { platforms } = await request.json();

    if (!platforms || !Array.isArray(platforms)) {
      return NextResponse.json(
        { error: "Platforms array is required" },
        { status: 400 }
      );
    }

    // Get the meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    if (!meeting.transcript) {
      return NextResponse.json(
        { error: "Meeting transcript not available" },
        { status: 400 }
      );
    }

    // Get user's automations for the requested platforms
    const automations = await prisma.automation.findMany({
      where: {
        userId: session.user.id,
        platform: {
          in: platforms,
        },
        isActive: true,
      },
    });

    const results = [];

    for (const platform of platforms) {
      try {
        const automation = automations.find(
          (auto) => auto.platform === platform
        );

        if (!automation) {
          results.push({
            platform,
            success: false,
            error: `No automation configured for ${platform}`,
          });
          continue;
        }

        // Generate the post content
        const postContent = await generateSocialMediaPost(
          meeting.transcript,
          meeting.title,
          platform as "linkedin" | "facebook",
          {
            description: automation.description,
            example: automation.example || undefined,
          }
        );

        // Post to the platform
        let postResult;
        if (platform === "facebook") {
          postResult = await postToFacebook(session.user.id, postContent);
        } else if (platform === "linkedin") {
          postResult = await postToLinkedIn(session.user.id, postContent);
        } else {
          results.push({
            platform,
            success: false,
            error: `Unsupported platform: ${platform}`,
          });
          continue;
        }

        if (postResult.success) {
          // Save the social post record
          await prisma.socialPost.create({
            data: {
              meetingId: meeting.id,
              platform,
              content: postContent,
              status: "posted",
              postedAt: new Date(),
            },
          });

          results.push({
            platform,
            success: true,
            postId: postResult.postId,
            content: postContent,
          });
        } else {
          // Save as failed post
          await prisma.socialPost.create({
            data: {
              meetingId: meeting.id,
              platform,
              content: postContent,
              status: "failed",
            },
          });

          results.push({
            platform,
            success: false,
            error: postResult.error,
            content: postContent,
          });
        }
      } catch (error) {
        console.error(`Error posting to ${platform}:`, error);
        results.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: "Social media posting completed",
    });
  } catch (error) {
    console.error("Error in post-social endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
