import EffectsSection from "@/components/EffectsSection";
import ExplorerLoader from "@/components/ExplorerLoader";
import Overview from "@/components/Overview";
import ThemeToggle from "@/components/ThemeToggle";
import { loadCoreData } from "@/lib/server-data";

export default async function Home() {
  const { meta, summary, determinism, prompts } = await loadCoreData();

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <span className="brand">
            <span className="brand-dot" aria-hidden="true" />
            Sampling Settings Benchmark
          </span>
          <nav className="nav">
            <a href="#overview">Overview</a>
            <a href="#effects">Effects</a>
            <a href="#explorer">Answers</a>
          </nav>
          <ThemeToggle />
        </div>
      </div>

      <main className="shell">
        <Overview summary={summary} meta={meta} />
        <EffectsSection summary={summary} />
        <ExplorerLoader prompts={prompts} determinism={determinism} />

        <footer className="footer">
          <p>
            Generated from <code>results/scored_results.csv</code> and{" "}
            <code>results/summary_by_condition.csv</code> by{" "}
            <code>export_dashboard_data.py</code>. Model: {meta.model}, run
            locally through Ollama. Re-run the benchmark and the export script
            to refresh this page.
          </p>
        </footer>
      </main>
    </>
  );
}
