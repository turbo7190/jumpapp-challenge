import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getBotTranscript, getBotStatus, pollBotStatus } from "@/lib/recall";
import {
  generateFollowUpEmail,
  generateSocialMediaPost,
  generateMeetingSummary,
} from "@/lib/openai";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        socialPosts: {
          include: {
            automation: true,
          } as any,
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read the request body once
    const body = await request.json();
    const { action } = body;

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (action === "process-transcript") {
      if (!meeting.recallBotId) {
        return NextResponse.json(
          { error: "No bot assigned to this meeting" },
          { status: 400 }
        );
      }

      try {
        // Check bot status and get transcript
        const botStatus = await getBotStatus(meeting.recallBotId);

        if (botStatus.status === "done") {
          const transcriptData = await getBotTranscript(meeting.recallBotId);
          const transcript = transcriptData.transcript || "";

          // Use processed sentences if available, otherwise fall back to raw transcript
          const transcriptContent = (meeting as any).transcriptSentences
            ? JSON.parse((meeting as any).transcriptSentences).join(" ")
            : transcript;

          // Generate AI content
          const [summary, followUpEmail] = await Promise.all([
            generateMeetingSummary(transcriptContent, meeting.title),
            generateFollowUpEmail(transcriptContent, meeting.title),
          ]);

          // Update meeting with transcript and generated content
          await prisma.meeting.update({
            where: { id: params.id },
            data: {
              transcript,
              summary,
              recallStatus: "completed",
            },
          });

          return NextResponse.json({
            success: true,
            transcript,
            summary,
            followUpEmail,
          });
        } else if (botStatus.status === "error") {
          await prisma.meeting.update({
            where: { id: params.id },
            data: { recallStatus: "failed" },
          });

          return NextResponse.json(
            { error: "Bot recording failed" },
            { status: 500 }
          );
        } else {
          return NextResponse.json({
            message: "Bot is still processing",
            status: botStatus.status,
          });
        }
      } catch (error) {
        console.error("Error processing transcript:", error);
        return NextResponse.json(
          { error: "Failed to process transcript" },
          { status: 500 }
        );
      }
    }

    if (action === "generate-follow-up-email") {
      if (!meeting.transcript && !(meeting as any).transcriptSentences) {
        return NextResponse.json(
          { error: "No transcript available" },
          { status: 400 }
        );
      }

      try {
        // Use processed sentences if available, otherwise fall back to raw transcript
        const transcriptContent = (meeting as any).transcriptSentences
          ? JSON.parse((meeting as any).transcriptSentences).join(" ")
          : meeting.transcript;

        const followUpEmail = await generateFollowUpEmail(
          transcriptContent,
          meeting.title
        );

        return NextResponse.json({
          success: true,
          followUpEmail,
        });
      } catch (error) {
        console.error("Error generating follow-up email:", error);
        return NextResponse.json(
          { error: "Failed to generate follow-up email" },
          { status: 500 }
        );
      }
    }

    if (action === "save-social-post") {
      const { platform, content, automationId } = body;

      try {
        // Save the social media post
        const socialPost = await prisma.socialPost.create({
          data: {
            meetingId: params.id,
            platform,
            content,
            status: "draft",
            automationId: automationId || null,
          } as any,
        });

        return NextResponse.json({
          success: true,
          post: socialPost,
        });
      } catch (error) {
        console.error("Error saving social post:", error);
        return NextResponse.json(
          { error: "Failed to save social post" },
          { status: 500 }
        );
      }
    }

    if (action === "generate-social-post") {
      const { platform, automationId } = body;

      if (!meeting.transcript && !(meeting as any).transcriptSentences) {
        return NextResponse.json(
          { error: "No transcript available" },
          { status: 400 }
        );
      }

      try {
        // Get automation config if provided
        let automationConfig:
          | { description: string; example?: string }
          | undefined;
        if (automationId) {
          const automation = await prisma.automation.findFirst({
            where: {
              id: automationId,
              userId: session.user.id,
              platform,
              isActive: true,
            },
          });
          automationConfig = automation
            ? {
                description: automation.description,
                example: automation.example || undefined,
              }
            : undefined;
        }

        // Use processed sentences if available, otherwise fall back to raw transcript
        const transcriptContent = (meeting as any).transcriptSentences
          ? JSON.parse((meeting as any).transcriptSentences).join(" ")
          : meeting.transcript;

        const postContent = await generateSocialMediaPost(
          transcriptContent,
          meeting.title,
          platform as "linkedin" | "facebook",
          automationConfig
        );

        // Save as draft
        const socialPost = await prisma.socialPost.create({
          data: {
            meetingId: params.id,
            platform,
            content: postContent,
            status: "draft",
          },
        });

        return NextResponse.json({
          success: true,
          post: socialPost,
        });
      } catch (error) {
        console.error("Error generating social post:", error);
        return NextResponse.json(
          { error: "Failed to generate social post" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing meeting action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
