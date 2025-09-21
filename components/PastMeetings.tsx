"use client";

import { useState, useEffect } from "react";
import {
  History,
  Clock,
  Users,
  Video,
  Eye,
  Mail,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  postedAt?: string;
  automation?: {
    id: string;
    name: string;
    description: string;
  };
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  platform: string;
  attendees?: string;
  transcript?: string;
  transcriptSentences?: string;
  summary?: string;
  recallBotId?: string;
  recallRecordingId?: string;
  recallTranscriptId?: string;
  recallStatus?: string;
  socialPosts: SocialPost[];
}

export default function PastMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFollowUpEmail, setShowFollowUpEmail] = useState(false);
  const [showSocialPost, setShowSocialPost] = useState(false);
  const [showSocialPostModal, setShowSocialPostModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [availableAutomations, setAvailableAutomations] = useState<any[]>([]);
  const [selectedAutomation, setSelectedAutomation] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<{
    followUpEmail?: string;
    socialPost?: string;
    socialPostPlatform?: string;
  }>({});
  const [postingToSocial, setPostingToSocial] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [checkingConnectionStatus, setCheckingConnectionStatus] =
    useState(false);

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings");
      const data = await response.json();
      setMeetings(data.past || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      setCheckingConnectionStatus(true);

      // Check LinkedIn connection
      const linkedinResponse = await fetch("/api/debug/linkedin-status");
      const linkedinData = await linkedinResponse.json();
      setLinkedinConnected(
        linkedinData.summary?.hasActiveSocialAccount || false
      );

      // Check Facebook connection
      const facebookResponse = await fetch("/api/debug/facebook-status");
      const facebookData = await facebookResponse.json();
      setFacebookConnected(
        facebookData.summary?.hasActiveSocialAccount || false
      );
    } catch (error) {
      console.error("Error checking connection status:", error);
      toast.error("Failed to check connection status");
    } finally {
      setCheckingConnectionStatus(false);
    }
  };

  const fetchMeetingDetails = async (meetingId: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      const meeting = await response.json();
      setSelectedMeeting(meeting);
    } catch (error) {
      console.error("Error fetching meeting details:", error);
      toast.error("Failed to fetch meeting details");
    }
  };

  const fetchAutomations = async (
    platform: string,
    preserveSelection: boolean = false
  ) => {
    try {
      const response = await fetch(
        `/api/automations?platform=${platform}&type=generate_post`
      );
      const data = await response.json();
      setAvailableAutomations(data || []);
      // Only auto-select the first automation if none is currently selected or if not preserving selection
      if (
        data &&
        data.length > 0 &&
        (!preserveSelection || !selectedAutomation)
      ) {
        setSelectedAutomation(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching automations:", error);
      toast.error("Failed to fetch automations");
    }
  };

  const generateFollowUpEmail = async (meetingId: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-follow-up-email" }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedContent({
          followUpEmail: data.followUpEmail,
        });
        toast.success("Follow-up email generated successfully");
      } else {
        toast.error(data.error || "Failed to generate follow-up email");
      }
    } catch (error) {
      console.error("Error generating follow-up email:", error);
      toast.error("Failed to generate follow-up email");
    }
  };

  const processTranscript = async (meetingId: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process-transcript" }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedContent({
          followUpEmail: data.followUpEmail,
        });
        toast.success("Transcript processed successfully");
        fetchMeetingDetails(meetingId);
      } else if (data.message) {
        toast(data.message);
      } else {
        toast.error(data.error || "Failed to process transcript");
      }
    } catch (error) {
      console.error("Error processing transcript:", error);
      toast.error("Failed to process transcript");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const generateSocialPost = async (
    meetingId: string,
    platform: string,
    forceAutomationId?: string
  ) => {
    try {
      toast.loading(`Generating ${platform} post...`, { id: "social-post" });

      // First fetch available automations for this platform
      // Preserve selection if we have a forced automation ID (regenerate case)
      await fetchAutomations(platform, !!forceAutomationId);

      // Use the forced automation ID if provided, otherwise use selected or first available
      const automationId =
        forceAutomationId ||
        selectedAutomation ||
        (availableAutomations.length > 0 ? availableAutomations[0].id : null);

      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-social-post",
          platform,
          automationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent({
          ...generatedContent,
          socialPost: data.post.content,
          socialPostPlatform: platform,
        });
        setSelectedPlatform(platform);
        setShowSocialPostModal(true);
        toast.success(`${platform} post generated successfully!`, {
          id: "social-post",
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate post", {
          id: "social-post",
        });
      }
    } catch (error) {
      console.error("Error generating social post:", error);
      toast.error("Failed to generate post", { id: "social-post" });
    }
  };

  const postToSocial = async (platform: string) => {
    if (!generatedContent.socialPost) {
      toast.error("No content to post");
      return;
    }

    // Check if platform is connected before posting
    const isConnected =
      platform === "linkedin" ? linkedinConnected : facebookConnected;

    if (!isConnected) {
      toast.error(
        `${
          platform.charAt(0).toUpperCase() + platform.slice(1)
        } is not connected. Please connect your ${platform} account in Settings first.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      setPostingToSocial(true);
      toast.loading(`Posting to ${platform}...`, { id: "posting-social" });

      // Use the unified social posting API
      const response = await fetch("/api/social/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          message: generatedContent.socialPost,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        let successMessage = `Successfully posted to ${platform}!`;

        if (platform === "linkedin" && result.postId) {
          successMessage = `Successfully posted to LinkedIn! Post ID: ${result.postId}`;
        } else if (platform === "facebook" && result.pageName) {
          successMessage = `Successfully posted to Facebook Page: ${result.pageName}!`;
        }

        toast.success(successMessage, { id: "posting-social" });

        // Save the post to database as posted
        if (selectedMeeting) {
          await fetch(`/api/meetings/${selectedMeeting.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "save-social-post",
              platform,
              content: generatedContent.socialPost,
              status: "posted",
            }),
          });
        }
      } else {
        toast.error(result.error || `Failed to post to ${platform}`, {
          id: "posting-social",
        });
      }
    } catch (error) {
      console.error(`Error posting to ${platform}:`, error);
      toast.error(`Failed to post to ${platform}`, { id: "posting-social" });
    } finally {
      setPostingToSocial(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    checkConnectionStatus();
  }, []);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "zoom":
        return (
          <div className="w-6 h-6 flex items-center justify-center bg-blue-500 rounded">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 13h2v2h-2v-2zm0-8h2v6h-2V7z" />
            </svg>
          </div>
        );
      case "teams":
        return (
          <div className="w-6 h-6 flex items-center justify-center bg-purple-600 rounded">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
            </svg>
          </div>
        );
      case "meet":
        return (
          <div className="w-6 h-6 flex items-center justify-center bg-green-500 rounded">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center bg-gray-500 rounded">
            <Video className="w-4 h-4 text-white" />
          </div>
        );
    }
  };

  const getRecallStatusDisplay = (meeting: Meeting) => {
    if (!meeting.recallBotId) {
      return null;
    }

    const status = meeting.recallStatus;
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Bot Scheduled
          </span>
        );
      case "recording_completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Processing Transcript
          </span>
        );
      case "transcript_processing":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Creating Transcript
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Transcript Ready
          </span>
        );
      case "transcript_failed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Transcript Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Past Meetings</h2>

      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <History className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No past meetings
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Your completed meetings will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meetings List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {meetings.map((meeting) => {
                const { date, time } = formatDateTime(meeting.startTime);
                const attendees = meeting.attendees
                  ? JSON.parse(meeting.attendees)
                  : [];

                return (
                  <li
                    key={meeting.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => fetchMeetingDetails(meeting.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {getPlatformIcon(meeting.platform)}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900">
                          {meeting.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {date} at {time}
                          </div>
                          {attendees.length > 0 && (
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {attendees.length} attendee
                              {attendees.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          {getRecallStatusDisplay(meeting)}
                          {(meeting.transcript ||
                            meeting.transcriptSentences) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Transcript Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Meeting Details */}
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedMeeting.title}
                </h3>

                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setShowTranscript(!showTranscript);
                        setShowFollowUpEmail(false);
                        setShowSocialPost(false);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Transcript
                    </button>

                    <button
                      onClick={() => {
                        if (
                          !selectedMeeting.transcript &&
                          !selectedMeeting.transcriptSentences
                        ) {
                          toast.error(
                            "No transcript available for this meeting"
                          );
                        } else {
                          setShowFollowUpEmail(!showFollowUpEmail);
                          setShowTranscript(false);
                          setShowSocialPost(false);
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Follow-up Email
                    </button>

                    <button
                      onClick={() => {
                        setShowSocialPost(!showSocialPost);
                        setShowTranscript(false);
                        setShowFollowUpEmail(false);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Social Media
                    </button>
                  </div>

                  {/* Content Display */}
                  {showTranscript &&
                    (selectedMeeting.transcriptSentences ||
                      selectedMeeting.transcript) && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Transcript
                        </h4>
                        {selectedMeeting.transcriptSentences ? (
                          <div className="space-y-3">
                            {(() => {
                              try {
                                const sentences = JSON.parse(
                                  selectedMeeting.transcriptSentences
                                );
                                return sentences.map(
                                  (sentence: string, index: number) => (
                                    <p
                                      key={index}
                                      className="text-sm text-gray-700"
                                    >
                                      {sentence}
                                    </p>
                                  )
                                );
                              } catch (error) {
                                console.error(
                                  "Error parsing transcript sentences:",
                                  error
                                );
                                return (
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {selectedMeeting.transcriptSentences}
                                  </p>
                                );
                              }
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedMeeting.transcript}
                          </p>
                        )}
                      </div>
                    )}

                  {showFollowUpEmail && (
                    <div className="mt-4">
                      {generatedContent.followUpEmail ? (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Follow-up Email
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
                            {generatedContent.followUpEmail}
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(generatedContent.followUpEmail!)
                            }
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-500 mb-4">
                            Generate a follow-up email based on the meeting
                            transcript
                          </p>
                          <button
                            onClick={() =>
                              generateFollowUpEmail(selectedMeeting.id)
                            }
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                          >
                            Generate Email
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {showSocialPost && (
                    <div className="mt-4">
                      {/* Connection Status for Social Posts */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            Social Media Connection Status
                          </h4>
                          <button
                            onClick={checkConnectionStatus}
                            disabled={checkingConnectionStatus}
                            className="text-xs text-blue-600 hover:text-blue-800 underline disabled:text-gray-400"
                          >
                            {checkingConnectionStatus
                              ? "Checking..."
                              : "Refresh"}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center">
                            {linkedinConnected ? (
                              <>
                                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-sm text-green-800">
                                  LinkedIn Connected
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                <span className="text-sm text-red-800">
                                  LinkedIn Not Connected
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center">
                            {facebookConnected ? (
                              <>
                                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-sm text-green-800">
                                  Facebook Connected
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                <span className="text-sm text-red-800">
                                  Facebook Not Connected
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {(!linkedinConnected || !facebookConnected) && (
                          <div className="mt-2 text-xs text-gray-600">
                            Connect your accounts in Settings to enable posting
                            functionality.
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 mb-4">
                        <button
                          onClick={() =>
                            generateSocialPost(selectedMeeting.id, "linkedin")
                          }
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                        >
                          Generate LinkedIn Post
                        </button>
                        <button
                          onClick={() =>
                            generateSocialPost(selectedMeeting.id, "facebook")
                          }
                          className="px-4 py-2 bg-blue-800 text-white text-sm font-medium rounded-md hover:bg-blue-900"
                        >
                          Generate Facebook Post
                        </button>
                      </div>

                      {generatedContent.socialPost && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Draft Post
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
                            {generatedContent.socialPost}
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                copyToClipboard(generatedContent.socialPost!)
                              }
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </button>
                            <button
                              onClick={() => postToSocial("linkedin")}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Media Post Modal */}
                  {showSocialPostModal && generatedContent.socialPost && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              Draft post
                            </h3>
                            <button
                              onClick={() => setShowSocialPostModal(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <span className="sr-only">Close</span>
                              <svg
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          <p className="text-sm text-gray-600 mb-4">
                            Generate a post based on insights from this meeting.
                          </p>

                          {/* Connection Status */}
                          <div className="mb-4 p-3 rounded-md border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                {selectedPlatform === "linkedin"
                                  ? "LinkedIn"
                                  : "Facebook"}{" "}
                                Connection Status
                              </span>
                              <button
                                onClick={checkConnectionStatus}
                                disabled={checkingConnectionStatus}
                                className="text-xs text-blue-600 hover:text-blue-800 underline disabled:text-gray-400"
                              >
                                {checkingConnectionStatus
                                  ? "Checking..."
                                  : "Refresh"}
                              </button>
                            </div>
                            <div className="mt-2 flex items-center">
                              {checkingConnectionStatus ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                  <span className="text-sm text-gray-600">
                                    Checking connection...
                                  </span>
                                </>
                              ) : (
                                  selectedPlatform === "linkedin"
                                    ? linkedinConnected
                                    : facebookConnected
                                ) ? (
                                <>
                                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                  <span className="text-sm text-green-800 font-medium">
                                    ✅ Connected and ready to post
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                  <span className="text-sm text-red-800 font-medium">
                                    ❌ Not connected
                                  </span>
                                </>
                              )}
                            </div>
                            {selectedPlatform === "linkedin" &&
                              !linkedinConnected && (
                                <div className="mt-2 text-xs text-red-600">
                                  Please connect your LinkedIn account in
                                  Settings to post content.
                                </div>
                              )}
                            {selectedPlatform === "facebook" &&
                              !facebookConnected && (
                                <div className="mt-2 text-xs text-red-600">
                                  Please connect your Facebook account in
                                  Settings to post content.
                                </div>
                              )}
                          </div>

                          {/* Automation Selection */}
                          {availableAutomations.length > 0 && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Automation
                              </label>
                              <select
                                value={selectedAutomation}
                                onChange={(e) =>
                                  setSelectedAutomation(e.target.value)
                                }
                                className="block w-full text-black px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                              >
                                {availableAutomations.map((automation) => (
                                  <option
                                    key={automation.id}
                                    value={automation.id}
                                  >
                                    {automation.name}
                                  </option>
                                ))}
                              </select>
                              {selectedAutomation && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                                  <p className="text-sm text-blue-800">
                                    {
                                      availableAutomations.find(
                                        (a) => a.id === selectedAutomation
                                      )?.description
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {generatedContent.socialPost}
                            </p>
                          </div>

                          <div className="flex justify-between">
                            <button
                              onClick={() => {
                                if (selectedMeeting) {
                                  generateSocialPost(
                                    selectedMeeting.id,
                                    selectedPlatform,
                                    selectedAutomation
                                  );
                                }
                              }}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Regenerate
                            </button>
                            <div className="flex space-x-3">
                              <button
                                onClick={() =>
                                  copyToClipboard(generatedContent.socialPost!)
                                }
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                              </button>
                              <button
                                onClick={() => setShowSocialPostModal(false)}
                                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  postToSocial(selectedPlatform);
                                  setShowSocialPostModal(false);
                                }}
                                disabled={
                                  postingToSocial ||
                                  checkingConnectionStatus ||
                                  (selectedPlatform === "linkedin" &&
                                    !linkedinConnected) ||
                                  (selectedPlatform === "facebook" &&
                                    !facebookConnected)
                                }
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                title={
                                  selectedPlatform === "linkedin" &&
                                  !linkedinConnected
                                    ? "LinkedIn not connected. Please connect in Settings first."
                                    : selectedPlatform === "facebook" &&
                                      !facebookConnected
                                    ? "Facebook not connected. Please connect in Settings first."
                                    : ""
                                }
                              >
                                {postingToSocial ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                    Posting...
                                  </>
                                ) : checkingConnectionStatus ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                    Checking...
                                  </>
                                ) : (
                                  "Post"
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
