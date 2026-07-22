"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Bell, ShieldCheck, Globe, Mail, Save } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

export default function AdminSettingsPage() {
  const toast = useNotifications();
  const [settings, setSettings] = useState({
    platformName: "AIHire",
    supportEmail: "support@aihire.com",
    maxUploadSize: "10",
    enableRegistration: true,
    enableApiAccess: true,
    enableBiasAudit: true,
    maintenanceMode: false,
  });

  const save = () => {
    toast.add({ type: "success", title: "Platform settings saved" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500">Configure global platform settings.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Globe className="h-4 w-4 text-blue" /> General
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-gray-600 font-medium">Platform Name</label>
            <input className="field mt-1" value={settings.platformName} onChange={(e) => setSettings((s) => ({ ...s, platformName: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-medium">Support Email</label>
            <input className="field mt-1" value={settings.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-medium">Max Upload Size (MB)</label>
            <input className="field mt-1" value={settings.maxUploadSize} onChange={(e) => setSettings((s) => ({ ...s, maxUploadSize: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Features
        </h2>
        {[
          { key: "enableRegistration", label: "User Registration", desc: "Allow new users to sign up" },
          { key: "enableApiAccess", label: "API Access", desc: "Enable REST API access for integrations" },
          { key: "enableBiasAudit", label: "Bias Audit", desc: "Enable bias detection for job descriptions" },
          { key: "maintenanceMode", label: "Maintenance Mode", desc: "Put platform in maintenance mode" },
        ].map((f) => (
          <label key={f.key} className="flex items-center justify-between rounded-xl bg-gray-50 p-3.5 cursor-pointer hover:bg-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">{f.label}</p>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
            <input type="checkbox" checked={settings[f.key as keyof typeof settings] as boolean} onChange={() => setSettings((s) => ({ ...s, [f.key]: !(s[f.key as keyof typeof settings]) }))} className="h-5 w-5 rounded border-gray-300 text-blue accent-blue" />
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={save} className="primary-btn"><Save className="h-4 w-4" /> Save Settings</button>
      </div>
    </div>
  );
}
