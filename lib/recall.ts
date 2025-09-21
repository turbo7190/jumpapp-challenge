import axios from "axios";

const RECALL_API_BASE = "https://us-west-2.recall.ai/api/v1";

export function validateBotConfiguration(): {
  isValid: boolean;
  message: string;
} {
  if (!process.env.RECALL_API_KEY) {
    return {
      isValid: false,
      message:
        "RECALL_API_KEY environment variable is not set. Please add your Recall.ai API key to the environment variables.",
    };
  }

  return {
    isValid: true,
    message: "Bot configuration is valid",
  };
}

export async function createBot(
  meetingUrl: string,
  startTime: string,
  botJoinMinutesBefore: number = 2
): Promise<string> {
  const validation = validateBotConfiguration();
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  if (!meetingUrl) {
    throw new Error("Meeting URL is required to create a bot");
  }

  if (!startTime) {
    throw new Error("Start time is required to create a bot");
  }

  try {
    console.log("📝 Creating new Recall.ai transcription bot...");

    // Calculate join_at time: start time minus botJoinMinutesBefore
    const meetingStartTime = new Date(startTime);
    const joinAtTime = new Date(
      meetingStartTime.getTime() - botJoinMinutesBefore * 60 * 1000
    );
    const joinAtISO = joinAtTime.toISOString();

    console.log(`📅 Meeting starts: ${meetingStartTime.toISOString()}`);
    console.log(
      `⏰ Bot will join: ${joinAtISO} (${botJoinMinutesBefore} minutes before)`
    );

    console.log(`Meeting URL: ${meetingUrl}`);

    const botData = {
      bot_name: `Transcription Bot ${new Date().toISOString()}`,
      meeting_url: meetingUrl,
      join_at: joinAtISO,
      recording_config: {
        transcript: {
          provider: {
            recallai_streaming: {
              language: "en",
            },
          },
        },
      },
    };

    console.log(botData, "botData ==================");

    const response = await axios.post(`${RECALL_API_BASE}/bot/`, botData, {
      headers: {
        Authorization: process.env.RECALL_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const botId = response.data.id;
    console.log(`✅ Created transcription bot with ID: ${botId}`);

    return botId;
  } catch (error: any) {
    console.error(
      "❌ Error creating bot:",
      error.response?.data || error.message,
      error
    );
    throw new Error(
      `Failed to create bot: ${error.response?.data?.detail || error.message}`
    );
  }
}

export async function createBotAndInvite(
  meetingUrl: string,
  startTime: string,
  botJoinMinutesBefore: number = 2,
  meetingTitle?: string
): Promise<{ botId: string }> {
  try {
    console.log(`🤖 Creating bot for meeting: ${meetingTitle || "Untitled"}`);

    // Create a new bot with the meeting URL and calculated join time
    const botId = await createBot(meetingUrl, startTime, botJoinMinutesBefore);

    console.log(`✅ Bot created successfully. Bot ID: ${botId}`);

    return {
      botId,
    };
  } catch (error) {
    console.error("❌ Error creating bot and invite:", error);
    throw error;
  }
}

export async function getBotStatus(botId: string) {
  try {
    const response = await axios.get(`${RECALL_API_BASE}/bot/${botId}/`, {
      headers: {
        Authorization: process.env.RECALL_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting bot status:", error);
    throw error;
  }
}

export async function getBotTranscript(botId: string) {
  try {
    const response = await axios.get(
      `${RECALL_API_BASE}/bot/${botId}/transcript/`,
      {
        headers: {
          Authorization: process.env.RECALL_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error getting bot transcript:", error);
    throw error;
  }
}

export async function getBotRecording(botId: string) {
  try {
    const response = await axios.get(
      `${RECALL_API_BASE}/bot/${botId}/recording/`,
      {
        headers: {
          Authorization: process.env.RECALL_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error getting bot recording:", error);
    throw error;
  }
}

export async function pollBotStatus(botId: string): Promise<any> {
  const maxAttempts = 30; // Poll for up to 30 minutes
  const interval = 60000; // 1 minute intervals

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await getBotStatus(botId);

      if (status.status === "done" || status.status === "error") {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error(
        `Error polling bot status (attempt ${attempt + 1}):`,
        error
      );
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Bot status polling timed out");
}

// Create transcript for a recording
export async function createTranscript(recordingId: string): Promise<string> {
  const validation = validateBotConfiguration();
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  try {
    console.log(`📝 Creating transcript for recording: ${recordingId}`);

    const response = await axios.post(
      `${RECALL_API_BASE}/recording/${recordingId}/create_transcript/`,
      {
        provider: {
          recallai_async: {
            language: "en",
          },
        },
      },
      {
        headers: {
          Authorization: process.env.RECALL_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const transcriptId = response.data.id;
    console.log(`✅ Created transcript with ID: ${transcriptId}`);
    return transcriptId;
  } catch (error: any) {
    console.error(
      "❌ Error creating transcript:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to create transcript: ${
        error.response?.data?.detail || error.message
      }`
    );
  }
}

// Get transcript data
export async function getTranscript(transcriptId: string): Promise<any> {
  const validation = validateBotConfiguration();
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  try {
    console.log(`📄 Fetching transcript: ${transcriptId}`);

    const response = await axios.get(
      `${RECALL_API_BASE}/transcript/${transcriptId}/`,
      {
        headers: {
          Authorization: process.env.RECALL_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Fetched transcript successfully`);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error fetching transcript:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to fetch transcript: ${
        error.response?.data?.detail || error.message
      }`
    );
  }
}

// Extract full sentences from word-level transcript data
export function extractSentences(transcriptData: any[]): string[] {
  const sentences: string[] = [];

  for (const participantData of transcriptData) {
    if (!participantData.words || !Array.isArray(participantData.words)) {
      continue;
    }

    let currentSentence = "";
    let lastEndTime = 0;
    const pauseThreshold = 1.5; // 1.5 second pause indicates sentence end

    for (let i = 0; i < participantData.words.length; i++) {
      const word = participantData.words[i];
      const currentStartTime = word.start_timestamp?.relative || 0;

      // Check if there's a significant pause (sentence break)
      if (
        i > 0 &&
        currentStartTime - lastEndTime > pauseThreshold &&
        currentSentence.trim()
      ) {
        // Only add sentence if it's not just a greeting or short phrase
        const trimmedSentence = currentSentence.trim();
        if (trimmedSentence.length > 3 || trimmedSentence.endsWith(".")) {
          sentences.push(trimmedSentence);
        }
        currentSentence = "";
      }

      // Add word to current sentence
      currentSentence += (currentSentence ? " " : "") + word.text;
      lastEndTime = word.end_timestamp?.relative || currentStartTime;
    }

    // Add the last sentence if it exists and is meaningful
    const trimmedSentence = currentSentence.trim();
    if (
      trimmedSentence &&
      (trimmedSentence.length > 3 || trimmedSentence.endsWith("."))
    ) {
      sentences.push(trimmedSentence);
    }
  }

  return sentences;
}

// Process transcript data to extract full sentences from word-level timestamps
function processTranscriptData(rawTranscriptData: any): any {
  try {
    // If the data is already in the correct format (array of participants with words), return as is
    if (Array.isArray(rawTranscriptData)) {
      return rawTranscriptData;
    }

    // If it's a string, try to parse it as JSON
    if (typeof rawTranscriptData === "string") {
      const parsed = JSON.parse(rawTranscriptData);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    // If it's an object with participants or words, try to extract the array
    if (rawTranscriptData && typeof rawTranscriptData === "object") {
      if (Array.isArray(rawTranscriptData.participants)) {
        return rawTranscriptData.participants;
      }
      if (Array.isArray(rawTranscriptData.words)) {
        // Single participant case - wrap in array
        return [
          {
            participant: {
              id: 1,
              name: "Speaker",
              is_host: true,
              platform: "desktop",
            },
            words: rawTranscriptData.words,
          },
        ];
      }
    }

    // If we can't process it, return the original data
    console.warn(
      "⚠️ Could not process transcript data format, returning raw data"
    );
    return rawTranscriptData;
  } catch (error) {
    console.error("❌ Error processing transcript data:", error);
    return rawTranscriptData;
  }
}

// Download transcript content from the download URL
export async function downloadTranscript(downloadUrl: string): Promise<any> {
  try {
    console.log(`📥 Downloading transcript from: ${downloadUrl}`);

    const response = await axios.get(downloadUrl);
    const rawTranscriptData = response.data;

    console.log(
      `✅ Downloaded transcript content (${
        JSON.stringify(rawTranscriptData).length
      } characters)`
    );

    // Process the transcript data to ensure it's in the correct format
    const processedTranscript = processTranscriptData(rawTranscriptData);

    return processedTranscript;
  } catch (error: any) {
    console.error(
      "❌ Error downloading transcript:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to download transcript: ${
        error.response?.data?.detail || error.message
      }`
    );
  }
}
