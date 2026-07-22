"use client";

import { useState, useEffect } from "react";
import { Server, Upload, CheckCircle, XCircle, RefreshCw, Brain } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";

export default function AdminModelsPage() {
  const toast = useNotifications();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = () => {
    setLoading(true);
    fetch(apiUrl("/api/models"))
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchModels(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Models</h1>
          <p className="text-sm text-gray-500">Manage AI embedding models.</p>
        </div>
        <button onClick={fetchModels} className="ghost-btn text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          [1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 border border-gray-200" />)
        ) : models.length > 0 ? (
          models.map((m: any) => (
            <div key={m.name} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-blue" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.files?.length ?? 0} files</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  m.loaded ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {m.loaded ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {m.loaded ? "Loaded" : "Not Loaded"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card">
            <Server className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">No models found</h3>
            <p className="text-sm text-gray-500 mt-1">Upload a model to enable semantic matching.</p>
          </div>
        )}
      </div>
    </div>
  );
}
