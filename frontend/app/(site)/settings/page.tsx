export default function SettingsPage() {
  return (
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <article className="glass rounded-3xl border border-white/10 p-6">
          <h1 className="text-2xl font-semibold">Workspace settings</h1>
          <p className="mt-2 text-sm text-slate-300">Configure matching defaults and transparency behavior.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Anonymization</p>
              <p className="mt-2 text-sm text-slate-300">Enabled for all screening runs and reports.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Semantic layer</p>
              <p className="mt-2 text-sm text-slate-300">Automatically uses SBERT when enabled in Docker semantic compose.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Report format</p>
              <p className="mt-2 text-sm text-slate-300">CSV leaderboard and per-candidate PDF transparency report.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Bias audit</p>
              <p className="mt-2 text-sm text-slate-300">Runs on each submitted job description before ranking.</p>
            </div>
          </div>
        </article>
      </section>
  );
}
