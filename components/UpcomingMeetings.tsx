"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Video,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  platform: string;
  meetingUrl?: string;
  attendees?: string;
  isNotetakerEnabled: boolean;
  recallBotId?: string;
  recallStatus?: string;
}

export default function UpcomingMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings");
      const data = await response.json();
      setMeetings(data.upcoming || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  const syncMeetings = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/meetings/sync", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        toast.success(`Synced ${data.syncedCount} new meetings`);
        fetchMeetings();
      } else if (response.status === 403) {
        toast.error(
          "Calendar access denied. Please go to Settings and re-authorize Google to grant calendar permissions.",
          { duration: 6000 }
        );
      } else {
        toast.error(data.error || "Failed to sync meetings");
      }
    } catch (error) {
      console.error("Error syncing meetings:", error);
      toast.error("Failed to sync meetings");
    } finally {
      setSyncing(false);
    }
  };

  const toggleNotetaker = async (meetingId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-notetaker",
          meetingId,
          isNotetakerEnabled: enabled,
        }),
      });

      if (response.ok) {
        toast.success(enabled ? "Notetaker enabled" : "Notetaker disabled");
        fetchMeetings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update notetaker");
      }
    } catch (error) {
      console.error("Error toggling notetaker:", error);
      toast.error("Failed to update notetaker");
    }
  };

  useEffect(() => {
    fetchMeetings();
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

  console.log(meetings, "meetings ==================");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Upcoming Meetings
        </h2>
        <button
          onClick={syncMeetings}
          disabled={syncing}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Syncing..." : "Sync Calendar"}
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No upcoming meetings
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Sync your calendar to see your upcoming meetings here.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {meetings.map((meeting) => {
              const { date, time } = formatDateTime(meeting.startTime);
              const attendees = meeting.attendees
                ? JSON.parse(meeting.attendees)
                : [];

              return (
                <li key={meeting.id} className="px-4 sm:px-6 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-3">
                        {getPlatformIcon(meeting.platform)}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">
                            {meeting.title}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-500 mt-1">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="break-words">
                                {date} at {time}
                              </span>
                            </div>
                            {attendees.length > 0 && (
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span>
                                  {attendees.length} attendee
                                  {attendees.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          </div>
                          {meeting.description && (
                            <p className="mt-2 text-sm text-gray-600 break-words line-clamp-2">
                              {meeting.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-start xl:items-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-y-2 lg:space-x-0 xl:space-y-0 xl:space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          Notetaker:
                        </span>
                        <button
                          onClick={() =>
                            toggleNotetaker(
                              meeting.id,
                              !meeting.isNotetakerEnabled
                            )
                          }
                          className="focus:outline-none flex-shrink-0"
                        >
                          {meeting.isNotetakerEnabled ? (
                            <ToggleRight className="w-6 h-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {meeting.recallStatus && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            meeting.recallStatus === "completed"
                              ? "bg-green-100 text-green-800"
                              : meeting.recallStatus === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {meeting.recallStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
