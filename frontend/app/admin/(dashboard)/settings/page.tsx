"use client";

import { useState } from "react";
import { ShieldCheck, Brain, FileText, Search, Save } from "lucide-react";

const defaultSettings = { anonymization: true, semanticEnabled: true, biasAudit: true, autoExportCsv: false };

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof typeof settings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const toggles = [
    { key: "anonymization" as const, label: "Anonymization", desc: "Detect and redact PII before scoring.", icon: ShieldCheck },
    { key: "semanticEnabled" as const, label: "Semantic Layer", desc: "Enable SBERT semantic scoring alongside TF-IDF.", icon: Brain },
    { key: "biasAudit" as const, label: "Bias Audit", desc: "Run bias detection on every screening run.", icon: Search },
    { key: "autoExportCsv" as const, label: "Auto-Export CSV", desc: "Auto-generate CSV exports after each session.", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl md:text-3xl text-white">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">Configure matching defaults and transparency behavior.</p>
        </div>
        <button onClick={save} className="primary-btn inline-flex items-center gap-2">
          <Save className="h-4 w-4" /> {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      <div className="space-y-3">
        {toggles.map(({ key, label, desc, icon: Icon }) => (
          <div key={key} className="glass-card flex items-start gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue/15 text-blue">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{label}</p>
                <button onClick={() => toggle(key)} className={`relative h-6 w-11 rounded-full transition-colors ${settings[key] ? "bg-blue" : "bg-white/20"}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings[key] ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h2 className="font-semibold text-white">Weights & Thresholds</h2>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-300">TF-IDF Weight</span><span className="text-zinc-500">0.65</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-blue to-red" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-300">Semantic Weight</span><span className="text-zinc-500">0.35</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[35%] rounded-full bg-gradient-to-r from-red to-blue" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
