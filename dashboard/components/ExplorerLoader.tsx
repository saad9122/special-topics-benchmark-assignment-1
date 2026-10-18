"use client";

import { useEffect, useState } from "react";
import ExplorerSection from "./ExplorerSection";
import type { DeterminismRow, Prompt, ResponseRow } from "@/lib/types";

/**
 * The responses file is the big one (~600 KB), so it is fetched in the
 * browser rather than inlined into the page.
 */
export default function ExplorerLoader({
  prompts,
  determinism,
}: {
  prompts: Prompt[];
  determinism: DeterminismRow[];
}) {
  const [responses, setResponses] = useState<ResponseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/data/responses.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ResponseRow[]) => {
        if (!cancelled) setResponses(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="section" id="explorer">
        <div className="card empty">
          Could not load the answers file ({error}). Run{" "}
          <code>python export_dashboard_data.py</code> in the project root to
          regenerate it.
        </div>
      </section>
    );
  }

  if (!responses) {
    return (
      <section className="section" id="explorer">
        <div className="section-head">
          <div className="section-kicker">Section 2</div>
          <h2 className="section-title">Explore what the model actually said</h2>
        </div>
        <div className="card empty">Loading the stored answers…</div>
      </section>
    );
  }

  return (
    <ExplorerSection
      responses={responses}
      prompts={prompts}
      determinism={determinism}
    />
  );
}
