import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { prisma } from "./prisma";

export async function getGoogleCalendarClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account?.access_token) {
    throw new Error("No Google access token found");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    scope:
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function fetchUpcomingEvents(userId: string) {
  try {
    const calendar = await getGoogleCalendarClient(userId);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: oneWeekFromNow.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      showDeleted: false,
      showHiddenInvitations: false,
    });

    const events = response.data.items || [];

    // Debug: Log attendees for each event
    console.log("📅 Google Calendar Events with attendees:");
    events.forEach((event, index) => {
      console.log(event, "event");
      console.log(`Event ${index + 1}: ${event.summary}`);
      console.log(`  Attendees:`, event.attendees || []);
      console.log(`  Attendee count:`, event.attendees?.length || 0);
    });

    return events;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
}

export function extractMeetingUrl(event: any): string | null {
  const description = event.description || "";
  const location = event.location || "";
  const hangoutLink = event.hangoutLink || "";

  // Look for various meeting URL patterns
  const urlPatterns = [
    /https:\/\/[a-zA-Z0-9.-]*zoom\.us\/j\/[0-9]+(?:\?[^\s]*)?/g,
    /https:\/\/[a-zA-Z0-9.-]*teams\.microsoft\.com\/l\/meetup-join\/[a-zA-Z0-9.-]+(?:\?[^\s]*)?/g,
    /https:\/\/meet\.google\.com\/[a-zA-Z0-9.-]+(?:\?[^\s]*)?/g,
    /https:\/\/[a-zA-Z0-9.-]*webex\.com\/[a-zA-Z0-9.-]+(?:\?[^\s]*)?/g,
  ];

  const searchText = `${description} ${location} ${hangoutLink}`;

  for (const pattern of urlPatterns) {
    const match = searchText.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return hangoutLink || null;
}

export function getPlatformFromUrl(url: string): string {
  if (url.includes("zoom.us")) return "zoom";
  if (url.includes("teams.microsoft.com")) return "teams";
  if (url.includes("meet.google.com")) return "meet";
  if (url.includes("webex.com")) return "webex";
  return "unknown";
}

export function extractAttendeesFromDescription(description: string): string[] {
  if (!description) return [];

  const attendees: string[] = [];

  // Common patterns for attendee lists in meeting descriptions
  const patterns = [
    // "Attendees:" followed by list
    /attendees?:\s*([^\n]+)/gi,
    // "Participants:" followed by list
    /participants?:\s*([^\n]+)/gi,
    // "Invited:" followed by list
    /invited:\s*([^\n]+)/gi,
    // "Meeting with:" pattern
    /meeting\s+with:\s*([^\n]+)/gi,
    // "Join:" followed by attendees
    /join:\s*([^\n]+)/gi,
    // Email patterns (more specific to avoid false positives)
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  ];

  for (const pattern of patterns) {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        // Clean up the match and split by common delimiters
        const cleaned = match.replace(
          /^(attendees?|participants?|invited|meeting\s+with|join):\s*/i,
          ""
        );
        const emails = cleaned
          .split(/[,;|\n\r]+/)
          .map((email) => email.trim())
          .filter((email) => email && email.includes("@")); // Only keep actual emails
        attendees.push(...emails);
      });
    }
  }

  // Remove duplicates and return
  return Array.from(new Set(attendees));
}
