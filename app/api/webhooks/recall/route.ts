import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createTranscript,
  getTranscript,
  downloadTranscript,
  extractSentences,
} from "@/lib/recall";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "🔔 Received Recall.ai webhook:",
      JSON.stringify(body, null, 2)
    );

    const { event, data } = body;

    if (!event || !data) {
      console.error("❌ Invalid webhook payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    switch (event) {
      case "recording.done":
        await handleRecordingDone(data);
        break;
      case "transcript.done":
        await handleTranscriptDone(data);
        break;
      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleRecordingDone(data: any) {
  try {
    const { recording, bot } = data;
    const recordingId = recording.id;
    const botId = bot.id;

    console.log(`📹 Recording done for bot ${botId}, recording ${recordingId}`);

    // Find the meeting by bot ID
    const meeting = await prisma.meeting.findFirst({
      where: {
        recallBotId: botId,
      },
    });

    if (!meeting) {
      console.error(`❌ No meeting found for bot ID: ${botId}`);
      return;
    }

    // Update meeting with recording ID
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        recallRecordingId: recordingId,
        recallStatus: "recording_completed",
      },
    });

    console.log(
      `✅ Updated meeting ${meeting.id} with recording ID: ${recordingId}`
    );

    // Create transcript for the recording
    try {
      const transcriptId = await createTranscript(recordingId);

      // Update meeting with transcript ID
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          recallTranscriptId: transcriptId,
          recallStatus: "transcript_processing",
        },
      });

      console.log(
        `✅ Created transcript ${transcriptId} for recording ${recordingId}`
      );
    } catch (transcriptError: any) {
      console.error(
        `❌ Failed to create transcript: ${transcriptError.message}`
      );
      // Don't fail the webhook if transcript creation fails
    }
  } catch (error: any) {
    console.error("❌ Error handling recording.done:", error);
    throw error;
  }
}

async function handleTranscriptDone(data: any) {
  try {
    const { transcript, bot } = data;
    const transcriptId = transcript.id;
    const botId = bot.id;

    console.log(
      `📄 Transcript done for bot ${botId}, transcript ${transcriptId}`
    );

    // Find the meeting by bot ID
    const meeting = await prisma.meeting.findFirst({
      where: {
        recallBotId: botId,
      },
    });

    if (!meeting) {
      console.error(`❌ No meeting found for bot ID: ${botId}`);
      return;
    }

    try {
      // Get transcript data
      const transcriptData = await getTranscript(transcriptId);

      if (transcriptData.status.code !== "done") {
        console.log(
          `⏳ Transcript ${transcriptId} not ready yet, status: ${transcriptData.status.code}`
        );
        return;
      }

      // Download transcript content
      const transcriptContent = await downloadTranscript(
        transcriptData.data.download_url
      );

      // Extract full sentences from the transcript data
      const sentences = extractSentences(transcriptContent);

      // Update meeting with both raw transcript and extracted sentences
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          transcript: JSON.stringify(transcriptContent), // Store raw transcript data
          transcriptSentences: JSON.stringify(sentences), // Store extracted sentences
          recallStatus: "completed",
        },
      });

      console.log(`✅ Updated meeting ${meeting.id} with transcript content`);
    } catch (transcriptError: any) {
      console.error(
        `❌ Failed to fetch transcript: ${transcriptError.message}`
      );
      // Update status to indicate transcript fetch failed
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          recallStatus: "transcript_failed",
        },
      });
    }
  } catch (error: any) {
    console.error("❌ Error handling transcript.done:", error);
    throw error;
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Recall.ai webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
