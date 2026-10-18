"""Scores the raw responses, writes summary tables, and draws the plots."""

import json
import os

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from benchmark_config import BENCHMARK_FILE
from metrics import (
    exact_repeat_rate,
    factual_match,
    hallucinated,
    json_clean_output,
    json_structure_valid,
    mean_pairwise_tfidf_similarity,
)

INPUT = "results/raw_results.csv"
RESULTS_DIR = "results"
PLOTS_DIR = "plots"

SETTING_LABELS = {
    "temperature": "Temperature",
    "top_k": "Top-K",
    "top_p": "Top-P",
}


def parse_list(value):
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def load_answer_key():
    """
    Read the answer key from the prompt file rather than from the saved CSV.

    This means a wrong or incomplete accepted answer can be corrected and the
    results rescored with `python analyze.py`, without re-running the models.
    """
    with open(BENCHMARK_FILE, encoding="utf-8") as f:
        prompts = json.load(f)

    return {
        p["id"]: {
            "acceptable_answers": p.get("acceptable_answers", []),
            "required_keys": p.get("required_keys", []),
        }
        for p in prompts
    }


def add_row_metrics(df):
    """Score every single response on its own."""
    df = df.copy()
    df["response"] = df["response"].fillna("")

    key = load_answer_key()
    df["acceptable_answers"] = [
        json.dumps(key.get(pid, {}).get("acceptable_answers", []))
        for pid in df["prompt_id"]
    ]
    df["required_keys"] = [
        json.dumps(key.get(pid, {}).get("required_keys", []))
        for pid in df["prompt_id"]
    ]

    df["factual_correct"] = [
        factual_match(resp, parse_list(ans)) if cat == "factual" else None
        for resp, ans, cat in zip(
            df["response"], df["acceptable_answers"], df["category"]
        )
    ]

    df["hallucinated"] = [
        hallucinated(resp) if cat == "trap" else None
        for resp, cat in zip(df["response"], df["category"])
    ]

    # On a factual prompt the model can be right, wrong, or it can refuse.
    # Refusing is not the same mistake as confidently stating something false,
    # so the two are counted separately.
    df["refused"] = [
        (1 - hallucinated(resp)) if cat == "factual" else None
        for resp, cat in zip(df["response"], df["category"])
    ]
    df["factual_wrong"] = [
        1 if (cat == "factual" and correct == 0 and ref == 0) else
        (0 if cat == "factual" else None)
        for cat, correct, ref in zip(
            df["category"], df["factual_correct"], df["refused"]
        )
    ]

    df["structure_valid"] = [
        json_structure_valid(resp, parse_list(keys)) if cat == "structure" else None
        for resp, keys, cat in zip(
            df["response"], df["required_keys"], df["category"]
        )
    ]

    df["json_clean"] = [
        json_clean_output(resp) if cat == "structure" else None
        for resp, cat in zip(df["response"], df["category"])
    ]

    return df


def determinism_per_prompt(df):
    """
    Determinism = how alike the repeats of the SAME prompt are.

    This must be measured within one prompt. Comparing answers to
    different prompts only measures how different the questions were.
    """
    rows = []
    group_cols = ["model", "experiment", "temperature", "top_k", "top_p", "prompt_id"]

    for keys, group in df.groupby(group_cols, dropna=False):
        texts = group["response"].tolist()
        rows.append(dict(
            zip(group_cols, keys),
            similarity=mean_pairwise_tfidf_similarity(texts),
            identical_rate=exact_repeat_rate(texts),
        ))

    return pd.DataFrame(rows)


def summarize(df, determinism):
    group_cols = ["model", "experiment", "temperature", "top_k", "top_p"]

    det = (
        determinism.groupby(group_cols, dropna=False)[["similarity", "identical_rate"]]
        .mean()
        .reset_index()
    )

    rows = []
    for keys, group in df.groupby(group_cols, dropna=False):
        factual = group["factual_correct"].dropna()
        refused = group["refused"].dropna()
        wrong = group["factual_wrong"].dropna()
        halluc = group["hallucinated"].dropna()
        structural = group["structure_valid"].dropna()
        clean = group["json_clean"].dropna()

        rows.append({
            **dict(zip(group_cols, keys)),
            "n_responses": len(group),
            "mean_response_words": group["response_words"].mean(),
            "mean_latency_seconds": group["elapsed_seconds"].mean(),
            "mean_tokens_per_second": group["tokens_per_second"].mean(),
            "factual_accuracy": factual.mean() if len(factual) else None,
            "factual_wrong_rate": wrong.mean() if len(wrong) else None,
            "factual_refusal_rate": refused.mean() if len(refused) else None,
            "hallucination_rate": halluc.mean() if len(halluc) else None,
            "structural_compliance": structural.mean() if len(structural) else None,
            "clean_json_rate": clean.mean() if len(clean) else None,
        })

    summary = pd.DataFrame(rows).merge(det, on=group_cols, how="left")
    return summary.sort_values(group_cols).reset_index(drop=True)


def line_plot(summary, setting, y, filename, title, ylabel, ylim=None):
    data = summary[summary["experiment"] == setting]
    if data.empty or data[y].isna().all():
        return

    plt.figure(figsize=(8, 5))
    sns.lineplot(data=data, x=setting, y=y, hue="model", marker="o")
    plt.title(title)
    plt.xlabel(SETTING_LABELS[setting])
    plt.ylabel(ylabel)
    if ylim:
        plt.ylim(*ylim)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, filename), dpi=160)
    plt.close()


def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)

    df = add_row_metrics(pd.read_csv(INPUT))
    determinism = determinism_per_prompt(df)
    summary = summarize(df, determinism)

    df.to_csv(f"{RESULTS_DIR}/scored_results.csv", index=False, encoding="utf-8-sig")
    determinism.to_csv(
        f"{RESULTS_DIR}/determinism_by_prompt.csv", index=False, encoding="utf-8-sig"
    )
    summary.to_csv(
        f"{RESULTS_DIR}/summary_by_condition.csv", index=False, encoding="utf-8-sig"
    )

    model_summary = (
        summary.groupby("model")[[
            "similarity",
            "identical_rate",
            "factual_accuracy",
            "factual_wrong_rate",
            "hallucination_rate",
            "structural_compliance",
            "mean_response_words",
            "mean_latency_seconds",
            "mean_tokens_per_second",
        ]]
        .mean()
        .reset_index()
    )
    model_summary.to_csv(
        f"{RESULTS_DIR}/model_summary.csv", index=False, encoding="utf-8-sig"
    )

    # Headline table: the one-line answer for each setting.
    headline = summary[[
        "model", "experiment", "temperature", "top_k", "top_p",
        "similarity", "factual_accuracy", "factual_wrong_rate",
        "hallucination_rate", "structural_compliance",
    ]]
    headline.to_csv(
        f"{RESULTS_DIR}/headline_table.csv", index=False, encoding="utf-8-sig"
    )

    for setting in ["temperature", "top_k", "top_p"]:
        label = SETTING_LABELS[setting]
        line_plot(
            summary, setting, "similarity",
            f"determinism_by_{setting}.png",
            f"Output Determinism vs {label}",
            "Similarity of repeated answers (1 = identical)",
            (0, 1.05),
        )
        line_plot(
            summary, setting, "factual_accuracy",
            f"factual_accuracy_by_{setting}.png",
            f"Factual Accuracy vs {label}",
            "Share of correct answers",
            (0, 1.05),
        )
        line_plot(
            summary, setting, "factual_wrong_rate",
            f"factual_errors_by_{setting}.png",
            f"Confidently Wrong Answers vs {label}",
            "Share of wrong answers (refusals excluded)",
            (0, 1.05),
        )
        line_plot(
            summary, setting, "hallucination_rate",
            f"hallucination_by_{setting}.png",
            f"Hallucination Rate vs {label}",
            "Share of invented answers (lower is better)",
            (0, 1.05),
        )
        line_plot(
            summary, setting, "structural_compliance",
            f"structure_by_{setting}.png",
            f"JSON Structure Compliance vs {label}",
            "Share of exactly correct JSON",
            (0, 1.05),
        )

    line_plot(
        summary, "temperature", "mean_latency_seconds",
        "latency_by_temperature.png",
        "Generation Latency vs Temperature",
        "Mean seconds per response",
    )

    print("Analysis complete.")
    print(f"  {RESULTS_DIR}/scored_results.csv       one row per response, scored")
    print(f"  {RESULTS_DIR}/summary_by_condition.csv one row per setting value")
    print(f"  {RESULTS_DIR}/model_summary.csv        one row per model")
    print(f"  {PLOTS_DIR}/                           charts")


if __name__ == "__main__":
    main()
