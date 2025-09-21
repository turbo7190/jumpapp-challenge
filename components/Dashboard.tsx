"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Navigation from "./Navigation";
import UpcomingMeetings from "./UpcomingMeetings";
import PastMeetings from "./PastMeetings";
import Settings from "./Settings";
import Automations from "./Automations";

type TabType = "upcoming" | "past" | "automations" | "settings";

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");

  const renderContent = () => {
    switch (activeTab) {
      case "upcoming":
        return <UpcomingMeetings />;
      case "past":
        return <PastMeetings />;
      case "automations":
        return <Automations />;
      case "settings":
        return <Settings />;
      default:
        return <UpcomingMeetings />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
}
