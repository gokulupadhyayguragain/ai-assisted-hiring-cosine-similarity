"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, User, Bell, Save } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

export default function SettingsPage() {
  const toast = useNotifications();
  const [name, setName] = useState("Jane Doe");
  const [email, setEmail] = useState("jane@company.com");
  const [language, setLanguage] = useState("en");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const save = () => {
    toast.add({ type: "success", title: "Settings saved successfully" });
  };

  return (
    <div className="container-px pt-28 pb-20">
      <div className="mx-auto max-w-3xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6 text-blue" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-500">Manage your account preferences and notifications.</p>
        </motion.div>

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <User className="h-5 w-5 text-blue" /> Profile
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-600 font-medium">Full Name</label>
              <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Email</label>
              <input className="field mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Language</label>
              <select className="field mt-1" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="ne">Nepali</option>
                <option value="es">Spanish</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Timezone</label>
              <select className="field mt-1" defaultValue="Asia/Kathmandu">
                <option value="Asia/Kathmandu">Asia/Kathmandu (UTC+5:45)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <Bell className="h-5 w-5 text-amber-600" /> Notifications
          </h2>
          <div className="space-y-3">
            {[
              { label: "Email notifications", desc: "Receive screening results and updates via email", value: emailNotifications, set: setEmailNotifications },
              { label: "Weekly digest", desc: "Get a weekly summary of all screening activity", value: weeklyDigest, set: setWeeklyDigest },
              { label: "Dark mode", desc: "Use dark theme for the dashboard (coming soon)", value: darkMode, set: setDarkMode, disabled: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={item.value} onChange={() => item.set(!item.value)} disabled={item.disabled} />
                  <div className={`h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-blue peer-checked:after:translate-x-full peer-disabled:opacity-50`} />
                </label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={save} className="primary-btn"><Save className="h-4 w-4" /> Save Settings</button>
        </div>
      </div>
    </div>
  );
}
