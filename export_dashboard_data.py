"""
Turns the benchmark CSVs into the JSON files the Next.js dashboard reads.

Run this after `python analyze.py`:

    python export_dashboard_data.py

It writes into dashboard/public/data/.
"""

import json
import os

import pandas as pd

RESULTS_DIR = "results"
OUT_DIR = os.path.join("dashboard", "public", "data")

ROUND_3 = [
    "similarity",
    "identical_rate",
    "factual_accuracy",
    "factual_wrong_rate",
    "factual_refusal_rate",
    "hallucination_rate",
    "structural_compliance",
    "clean_json_rate",
    "mean_response_words",
    "mean_latency_seconds",
    "mean_tokens_per_second",
]


def clean(value):
    """JSON cannot hold NaN, so empty values become None."""
    if pd.isna(value):
        return None
    return value


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    summary = pd.read_csv(f"{RESULTS_DIR}/summary_by_condition.csv")
    for col in ROUND_3:
        if col in summary.columns:
            summary[col] = summary[col].round(4)

    scored = pd.read_csv(f"{RESULTS_DIR}/scored_results.csv")
    scored["response"] = scored["response"].fillna("")

    with open("benchmark_prompts.json", encoding="utf-8") as f:
        prompts = json.load(f)

    # Only the columns the explorer actually shows, to keep the payload small.
    keep = [
        "prompt_id", "category", "difficulty", "experiment",
        "temperature", "top_k", "top_p", "seed", "response",
        "response_words", "elapsed_seconds", "tokens_per_second",
        "factual_correct", "hallucinated", "refused", "factual_wrong",
        "structure_valid",
    ]
    responses = scored[[c for c in keep if c in scored.columns]].copy()
    responses["elapsed_seconds"] = responses["elapsed_seconds"].round(2)
    responses["tokens_per_second"] = responses["tokens_per_second"].round(1)

    determinism = pd.read_csv(f"{RESULTS_DIR}/determinism_by_prompt.csv")
    determinism["similarity"] = determinism["similarity"].round(4)
    determinism["identical_rate"] = determinism["identical_rate"].round(4)

    model_summary = pd.read_csv(f"{RESULTS_DIR}/model_summary.csv")

    meta = {
        "model": str(model_summary["model"].iloc[0]),
        "total_responses": int(len(scored)),
        "n_prompts": int(scored["prompt_id"].nunique()),
        "n_conditions": int(len(summary)),
        "n_seeds": int(scored["seed"].nunique()),
        "seeds": sorted(int(s) for s in scored["seed"].unique()),
        "baseline": {"temperature": 0.7, "top_k": 40, "top_p": 0.9},
        "overall": {
            k: clean(round(float(model_summary[k].iloc[0]), 4))
            for k in model_summary.columns
            if k != "model"
        },
    }

    payloads = {
        "meta.json": meta,
        "summary.json": json.loads(summary.to_json(orient="records")),
        "responses.json": json.loads(responses.to_json(orient="records")),
        "determinism.json": json.loads(determinism.to_json(orient="records")),
        "prompts.json": prompts,
    }

    for name, payload in payloads.items():
        path = os.path.join(OUT_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        size_kb = os.path.getsize(path) / 1024
        print(f"  {path}  ({size_kb:.0f} KB)")

    print("\nDashboard data written. Now run:  cd dashboard && npm run dev")


if __name__ == "__main__":
    main()
