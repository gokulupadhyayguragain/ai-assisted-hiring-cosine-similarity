"use client";

import { useState } from "react";
import {
  Building2,
  Bell,
  Key,
  Copy,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { useNotifications } from "@/lib/notifications";

export default function HrSettingsPage() {
  const toast = useNotifications();
  const [showKey, setShowKey] = useState(false);
  const [org, setOrg] = useState({
    name: "Acme Corp",
    website: "https://acme.com",
    email: "hr@acme.com",
    timezone: "Asia/Kathmandu",
  });

  const [notifPrefs, setNotifPrefs] = useState({
    screeningComplete: true,
    biasWarnings: true,
    newCandidates: false,
    weeklyReport: true,
  });

  const apiKey = "aihire_sk_live_8x7k9m3n2p4q1r5t6v8w0y";

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.add({ type: "success", title: "API key copied to clipboard" });
  };

  const saveSettings = () => {
    toast.add({ type: "success", title: "Settings saved successfully" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization, API keys, and preferences.
        </p>
      </div>

      {/* Organization */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Building2 className="h-5 w-5 text-blue" />
          Organization
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-gray-600 font-medium">
              Company Name
            </label>
            <input
              className="field mt-1"
              value={org.name}
              onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-medium">Website</label>
            <input
              className="field mt-1"
              value={org.website}
              onChange={(e) =>
                setOrg((o) => ({ ...o, website: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-medium">
              HR Email
            </label>
            <input
              className="field mt-1"
              value={org.email}
              onChange={(e) =>
                setOrg((o) => ({ ...o, email: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-medium">
              Timezone
            </label>
            <select
              className="field mt-1"
              value={org.timezone}
              onChange={(e) =>
                setOrg((o) => ({ ...o, timezone: e.target.value }))
              }
            >
              <option value="Asia/Kathmandu">
                Asia/Kathmandu (UTC+5:45)
              </option>
              <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">
                America/New_York (UTC-5)
              </option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Key className="h-5 w-5 text-amber-600" />
          API Key
        </h2>
        <p className="text-xs text-gray-500">
          Use this key to integrate AIHire with your ATS or custom tools.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
            <code className="text-sm text-gray-700 font-mono flex-1 truncate">
              {showKey ? apiKey : "aihire_sk_live_••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowKey((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={copyKey} className="ghost-btn text-sm px-3 py-2.5">
            <Copy className="h-4 w-4" /> Copy
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Bell className="h-5 w-5 text-indigo-600" />
          Notification Preferences
        </h2>
        <div className="space-y-3">
          {[
            {
              key: "screeningComplete",
              label: "Screening Complete",
              desc: "Get notified when AI screening finishes processing",
            },
            {
              key: "biasWarnings",
              label: "Bias Warnings",
              desc: "Alert when bias is detected in a job description",
            },
            {
              key: "newCandidates",
              label: "New Candidates",
              desc: "Notify when candidates upload their resumes",
            },
            {
              key: "weeklyReport",
              label: "Weekly Report",
              desc: "Receive a weekly summary of screening activity",
            },
          ].map((n) => (
            <label
              key={n.key}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{n.label}</p>
                <p className="text-xs text-gray-500">{n.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={
                  notifPrefs[n.key as keyof typeof notifPrefs]
                }
                onChange={() =>
                  setNotifPrefs((p) => ({
                    ...p,
                    [n.key]: !p[n.key as keyof typeof notifPrefs],
                  }))
                }
                className="h-5 w-5 rounded border-gray-300 text-blue focus:ring-blue accent-blue"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={saveSettings} className="primary-btn">
          <Save className="h-4 w-4" /> Save All Settings
        </button>
      </div>
    </div>
  );
}
