"use client";

import { useState } from "react";
import { Settings, Sliders, ShieldCheck, Bell, CheckCircle } from "lucide-react";

export default function HrSettingsPage() {
  const [tfidfWeight, setTfidfWeight] = useState(65);
  const [anonymize, setAnonymize] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save to localStorage for now
    localStorage.setItem("hr.settings", JSON.stringify({ tfidfWeight, anonymize }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Configure your screening preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Scoring Weights */}
        <div className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sliders className="h-5 w-5 text-blue" />
            Scoring Weights
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Adjust the balance between TF-IDF keyword matching and semantic understanding.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-300">TF-IDF Weight</label>
                <span className="text-sm font-semibold text-white">{tfidfWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={tfidfWeight}
                onChange={(e) => setTfidfWeight(Number(e.target.value))}
                className="mt-2 w-full accent-blue"
              />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>Semantic {100 - tfidfWeight}%</span>
                <span>TF-IDF {tfidfWeight}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Anonymization */}
        <div className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-blue" />
            Privacy & Anonymization
          </h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Auto-anonymize resumes before screening</p>
              <p className="text-xs text-zinc-500">Redacts PII (names, emails, phone numbers) before scoring</p>
            </div>
            <button
              onClick={() => setAnonymize(!anonymize)}
              className={`relative h-6 w-11 rounded-full transition-colors ${anonymize ? "bg-blue" : "bg-white/20"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${anonymize ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Bell className="h-5 w-5 text-blue" />
            Notifications
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Email me when screening completes</span>
              <div className="h-6 w-11 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Weekly bias audit summary</span>
              <div className="h-6 w-11 rounded-full bg-white/20" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="primary-btn">
          {saved && <CheckCircle className="h-4 w-4" />}
          {saved ? "Settings Saved" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
