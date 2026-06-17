"use client";

import { Server } from "lucide-react";
import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

export default function AdminModelsPage() {
  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/models"))
      .then((r) => r.json())
      .then((d) => setModels(d.models || []))
      .catch(() => setModels([]));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="display-title text-3xl text-white">Model Management</h1>
      <p className="text-sm text-zinc-400">View and manage deployed AI models.</p>
      {models.length > 0 ? (
        <div className="grid gap-4">
          {models.map((m: any) => (
            <div key={m.name} className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                  <p className="text-xs text-zinc-500">{m.files?.length || 0} files</p>
                </div>
                <span className={`chip ${m.loaded ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"}`}>
                  {m.loaded ? "Loaded" : "Unloaded"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <Server className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No models deployed yet.</p>
        </div>
      )}
    </div>
  );
}
