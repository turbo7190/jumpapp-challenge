import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateFollowUpEmail(
  transcript: string,
  meetingTitle: string
) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional assistant helping financial advisors write follow-up emails after client meetings. 
          Generate a warm, professional follow-up email that summarizes the key points discussed in the meeting.
          The email should be personalized and show that you were actively listening during the meeting.`,
        },
        {
          role: "user",
          content: `Meeting Title: ${meetingTitle}
          
          Transcript: ${transcript}
          
          Please generate a follow-up email that:
          1. Thanks the client for their time
          2. Summarizes the key discussion points
          3. Outlines next steps or action items
          4. Maintains a warm, professional tone
          5. Is appropriate for a financial advisor-client relationship`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating follow-up email:", error);
    throw error;
  }
}

export async function generateSocialMediaPost(
  transcript: string,
  meetingTitle: string,
  platform: "linkedin" | "facebook",
  automationConfig?: {
    description: string;
    example?: string;
  }
) {
  try {
    const platformGuidelines = {
      linkedin: "LinkedIn professional post (120-180 words)",
      facebook: "Facebook post (100-150 words)",
    };

    const systemPrompt = `You are a social media content creator for a financial advisor. 
    Generate a ${
      platformGuidelines[platform]
    } based on a client meeting transcript.
    ${automationConfig?.description || ""}
    
    Guidelines:
    - Use a warm, conversational tone consistent with an experienced financial advisor
    - Focus on valuable insights or advice shared during the meeting
    - End with 2-3 relevant hashtags
    - Make it engaging and professional
    - Don't include specific client details or personal information
    - Return only the post text with hashtags`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Meeting Title: ${meetingTitle}
          
          Transcript: ${transcript}
          
          ${
            automationConfig?.example
              ? `Example of desired style: ${automationConfig.example}`
              : ""
          }
          
          Generate a ${platform} post that summarizes the meeting value in first person.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating social media post:", error);
    throw error;
  }
}

export async function generateMeetingSummary(
  transcript: string,
  meetingTitle: string
) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a professional assistant that creates concise meeting summaries. Generate a clear, structured summary of the key points discussed in the meeting.",
        },
        {
          role: "user",
          content: `Meeting Title: ${meetingTitle}
          
          Transcript: ${transcript}
          
          Please create a summary that includes:
          1. Key discussion points
          2. Decisions made
          3. Action items
          4. Next steps`,
        },
      ],
      max_tokens: 400,
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating meeting summary:", error);
    throw error;
  }
}
