"use client";

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Link,
  Unlink,
  Clock,
  Key,
} from "lucide-react";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";

interface UserSettings {
  botJoinMinutesBefore: number;
  openaiApiKey?: string;
}

interface SocialAccount {
  id: string;
  platform: string;
  platformUserId: string;
  isActive: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    botJoinMinutesBefore: 2,
  });
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      setSettings(data.settings || { botJoinMinutesBefore: 2 });
      setSocialAccounts(data.socialAccounts || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const connectSocialAccount = async (platform: string) => {
    try {
      console.log(`🔗 Initiating ${platform} OAuth connection...`);

      // For Facebook, we need to force a fresh OAuth flow
      // Clear any existing session for this provider first
      if (platform === "facebook") {
        // Disconnect existing Facebook account if any
        const existingAccount = socialAccounts.find(
          (acc) => acc.platform === "facebook" && acc.isActive
        );
        if (existingAccount) {
          console.log("🗑️ Disconnecting existing Facebook account...");
          await disconnectSocialAccount(existingAccount.id);
        }
      }

      // Use NextAuth's signIn function to initiate OAuth flow
      // Force redirect to OAuth provider
      await signIn(platform, {
        callbackUrl: `${window.location.origin}/#settings`,
        redirect: true, // Force redirect to OAuth provider
      });
    } catch (error) {
      console.error("Error connecting social account:", error);
      toast.error("Failed to connect social account");
    }
  };

  const disconnectSocialAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/social-accounts/${accountId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Social account disconnected");
        fetchSettings();
      } else {
        toast.error("Failed to disconnect social account");
      }
    } catch (error) {
      console.error("Error disconnecting social account:", error);
      toast.error("Failed to disconnect social account");
    }
  };

  const reauthorizeGoogle = async () => {
    try {
      const response = await fetch("/api/auth/revoke", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Google account disconnected. ${data.deletedAccounts} account(s) removed. Please sign in again to grant calendar permissions.`
        );

        // Clear any cached session data
        if (typeof window !== "undefined") {
          // Clear NextAuth session cookies
          document.cookie =
            "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie =
            "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie =
            "next-auth.callback-url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }

        // Wait a moment then redirect to sign in page
        setTimeout(() => {
          window.location.href = "/auth/signin";
        }, 1000);
      } else {
        const errorData = await response.json();
        toast.error(
          `Failed to disconnect Google account: ${
            errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error reauthorizing Google:", error);
      toast.error("Failed to reauthorize Google account");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Calendar Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Google Calendar
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Join meetings (minutes before start)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.botJoinMinutesBefore}
                placeholder="2"
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    botJoinMinutesBefore: parseInt(e.target.value) || 2,
                  })
                }
                className="mt-1 block w-full px-2 py-1 border text-black border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                How many minutes before a meeting should the notetaker bot join?
              </p>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Key className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={settings.openaiApiKey || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    openaiApiKey: e.target.value,
                  })
                }
                className="mt-1 block w-full px-2 py-1 border text-black border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="sk-..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Required for AI content generation
              </p>
            </div>
          </div>
        </div>

        {/* Social Media Accounts */}
        <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center mb-4">
            <Link className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Social Media Accounts
            </h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LinkedIn */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                      in
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        LinkedIn
                      </h4>
                      <p className="text-sm text-gray-500">
                        {socialAccounts.find(
                          (acc) => acc.platform === "linkedin" && acc.isActive
                        )
                          ? "Connected"
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {socialAccounts.find(
                      (acc) => acc.platform === "linkedin" && acc.isActive
                    ) ? (
                      <button
                        onClick={() => {
                          const account = socialAccounts.find(
                            (acc) => acc.platform === "linkedin" && acc.isActive
                          );
                          if (account) disconnectSocialAccount(account.id);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectSocialAccount("linkedin")}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Facebook */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-800 rounded flex items-center justify-center text-white font-bold">
                      f
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Facebook
                      </h4>
                      <p className="text-sm text-gray-500">
                        {socialAccounts.find(
                          (acc) => acc.platform === "facebook" && acc.isActive
                        )
                          ? "Connected"
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {socialAccounts.find(
                      (acc) => acc.platform === "facebook" && acc.isActive
                    ) ? (
                      <button
                        onClick={() => {
                          const account = socialAccounts.find(
                            (acc) => acc.platform === "facebook" && acc.isActive
                          );
                          if (account) disconnectSocialAccount(account.id);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectSocialAccount("facebook")}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
