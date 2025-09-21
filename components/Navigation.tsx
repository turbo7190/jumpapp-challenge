"use client";

import { useSession, signOut } from "next-auth/react";
import { Calendar, History, Settings, Zap, LogOut } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type TabType = "upcoming" | "past" | "automations" | "settings";

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Navigation({
  activeTab,
  setActiveTab,
}: NavigationProps) {
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Use NextAuth's built-in signOut with redirect to Google logout
      await signOut({
        callbackUrl:
          "https://accounts.google.com/logout?continue=http://localhost:3000/auth/signin",
      });
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("Error during logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const tabs = [
    { id: "upcoming" as TabType, name: "Upcoming Meetings", icon: Calendar },
    { id: "past" as TabType, name: "Past Meetings", icon: History },
    { id: "automations" as TabType, name: "Automations", icon: Zap },
    { id: "settings" as TabType, name: "Settings", icon: Settings },
  ];

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Jump App</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session?.user?.email}
              </span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none transition ease-in-out duration-150 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
